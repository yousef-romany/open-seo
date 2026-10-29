import { sort } from "remeda";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { PageOptimizerService } from "@/server/features/page-optimizer/services/PageOptimizerService";
import type {
  PageOptimizerInternalLinkSuggestion,
  PageOptimizerInternalLinksResult,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const INSPECTION_LIMIT = 6;
const SUGGESTION_LIMIT = 4;
const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const STOP_WORDS = new Set([
  "about",
  "and",
  "best",
  "for",
  "from",
  "guide",
  "home",
  "more",
  "our",
  "page",
  "the",
  "this",
  "to",
  "with",
  "your",
  "إلى",
  "التي",
  "الذي",
  "عن",
  "على",
  "في",
  "من",
  "مع",
  "هذا",
  "هذه",
  "و",
]);

type AuditPage = Awaited<
  ReturnType<typeof AuditRepository.getPagesForAudit>
>[number];

function normalizedText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(value: string): string[] {
  const found = new Set<string>();
  for (const part of segmenter.segment(normalizedText(value))) {
    const token = part.segment.trim();
    if (
      !part.isWordLike ||
      token.length < 2 ||
      STOP_WORDS.has(token) ||
      /^\p{N}+$/u.test(token)
    ) {
      continue;
    }
    found.add(token);
  }
  return [...found];
}

function pageKey(value: string): string | null {
  try {
    const url = new URL(value);
    const pathname =
      url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/u, "");
    return `${url.origin.toLocaleLowerCase()}${pathname}`;
  } catch {
    return null;
  }
}

function pageScore(page: AuditPage, target: PageOptimizerSuccess): number {
  const keyword = normalizedText(target.targetKeyword);
  const title = normalizedText(page.title ?? "");
  const description = normalizedText(page.metaDescription ?? "");
  const url = normalizedText(page.url.replace(/[-_/]+/gu, " "));
  const targetWords = significantWords(
    [
      target.targetKeyword,
      target.page.title,
      target.page.metaDescription,
      target.page.h1s.join(" "),
    ].join(" "),
  );

  let score = 0;
  if (title.includes(keyword)) score += 10;
  if (description.includes(keyword)) score += 5;
  if (url.includes(keyword)) score += 4;
  for (const word of targetWords) {
    if (title.includes(word)) score += 3;
    if (description.includes(word)) score += 1;
    if (url.includes(word)) score += 1;
  }
  return score;
}

function alreadyLinksTo(
  links: Array<{ targetUrl: string; isInternal: boolean }>,
  destinationUrl: string,
): boolean {
  const destinationKey = pageKey(destinationUrl);
  return (
    destinationKey !== null &&
    links.some(
      (link) => link.isInternal && pageKey(link.targetUrl) === destinationKey,
    )
  );
}

function displayTitle(page: AuditPage): string {
  if (page.title?.trim()) return page.title.trim();
  try {
    const url = new URL(page.url);
    return url.pathname === "/"
      ? url.hostname
      : decodeURIComponent(
          url.pathname.split("/").filter(Boolean).at(-1) ?? url.hostname,
        )
          .replace(/[-_]+/gu, " ")
          .trim();
  } catch {
    return page.url;
  }
}

function suggestedAnchor(page: AuditPage): string {
  const title = displayTitle(page)
    .split(/\s+[|–—]\s+|\s+-\s+/u)[0]
    ?.trim();
  if (title && title.length <= 80) return title;
  return title?.slice(0, 77).trimEnd().concat("…") ?? displayTitle(page);
}

function sharedTopics(page: AuditPage, target: PageOptimizerSuccess): string[] {
  const pageWords = new Set(
    significantWords(
      [page.title ?? "", page.metaDescription ?? "", page.url].join(" "),
    ),
  );
  return significantWords(
    [target.targetKeyword, target.page.title, target.page.h1s.join(" ")].join(
      " ",
    ),
  )
    .filter((word) => pageWords.has(word))
    .slice(0, 3);
}

function reason(page: AuditPage, target: PageOptimizerSuccess): string {
  const topics = sharedTopics(page, target);
  if (topics.length === 0) {
    return "This audited page is one of the closest topical matches on the site.";
  }
  return `Both pages cover ${topics.map((topic) => `“${topic}”`).join(", ")}, so the link gives visitors a relevant next step.`;
}

function placement(bodyText: string, destinationTerms: string): string {
  const terms = significantWords(destinationTerms);
  const sentences = bodyText
    .split(/(?<=[.!?؟])\s+|\n+/u)
    .map((sentence) =>
      sentence
        .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 180);
  const ranked = sort(sentences, (first, second) => {
    const overlap = (sentence: string) => {
      const normalized = normalizedText(sentence);
      return terms.filter((term) => normalized.includes(term)).length;
    };
    return overlap(second) - overlap(first);
  });
  const best = ranked[0];
  if (best && terms.some((term) => normalizedText(best).includes(term))) {
    return `Place it near: “${best}”`;
  }
  return `Add it where the page discusses ${destinationTerms.trim()}.`;
}

async function suggest(input: {
  projectId: string;
  url: string;
  targetKeyword: string;
}): Promise<PageOptimizerInternalLinksResult> {
  const audit = await AuditRepository.getLatestCompletedAuditForProject(
    input.projectId,
  );
  if (!audit) return { status: "no_audit" };

  const [pages, targetInspection] = await Promise.all([
    AuditRepository.getPagesForAudit(audit.id),
    PageOptimizerService.inspect({
      url: input.url,
      targetKeyword: input.targetKeyword,
    }),
  ]);
  if (!targetInspection.result.ok) {
    throw new Error(
      "The page could not be read for internal link suggestions.",
    );
  }

  const target = targetInspection.result;
  const targetKey = pageKey(target.url) ?? pageKey(input.url);
  const eligiblePages = pages.filter(
    (page) =>
      pageKey(page.url) !== targetKey &&
      page.fetchClass === "ok" &&
      page.isIndexable &&
      (page.statusCode === null ||
        (page.statusCode >= 200 && page.statusCode < 300)) &&
      page.wordCount > 0,
  );
  const rankedPages = sort(eligiblePages, (first, second) => {
    const scoreDifference =
      pageScore(second, target) - pageScore(first, target);
    if (scoreDifference !== 0) return scoreDifference;
    return second.wordCount - first.wordCount;
  });
  const seenPageKeys = new Set<string>();
  const uniquePages = rankedPages.filter((page) => {
    const key = pageKey(page.url);
    if (!key || seenPageKeys.has(key)) return false;
    seenPageKeys.add(key);
    return true;
  });
  const relevantPages = uniquePages
    .filter((page) => pageScore(page, target) > 0)
    .slice(0, INSPECTION_LIMIT);

  const inspectedPages = await Promise.all(
    relevantPages.map(async (page) => ({
      page,
      inspection: await PageOptimizerService.inspect({
        url: page.url,
        targetKeyword: input.targetKeyword,
      }),
    })),
  );
  const readablePages = inspectedPages.filter(
    (entry) => entry.inspection.result.ok,
  );
  const existingIncomingLinks = readablePages.filter((entry) =>
    alreadyLinksTo(entry.inspection.links, target.url),
  ).length;
  const existingOutgoingLinks = relevantPages.filter((page) =>
    alreadyLinksTo(targetInspection.links, page.url),
  ).length;

  const incoming: PageOptimizerInternalLinkSuggestion[] = readablePages
    .filter((entry) => !alreadyLinksTo(entry.inspection.links, target.url))
    .slice(0, SUGGESTION_LIMIT)
    .map(({ page, inspection }) => ({
      id: `to-page:${page.url}`,
      direction: "to_page",
      sourceUrl: page.url,
      sourceTitle: displayTitle(page),
      destinationUrl: target.url,
      destinationTitle: target.page.title || target.targetKeyword,
      suggestedAnchor: target.targetKeyword,
      reason: reason(page, target),
      placement: placement(
        inspection.bodyText,
        `${target.targetKeyword} ${target.page.title}`,
      ),
    }));
  const outgoing: PageOptimizerInternalLinkSuggestion[] = relevantPages
    .filter((page) => !alreadyLinksTo(targetInspection.links, page.url))
    .slice(0, SUGGESTION_LIMIT)
    .map((page) => ({
      id: `from-page:${page.url}`,
      direction: "from_page",
      sourceUrl: target.url,
      sourceTitle: target.page.title || target.targetKeyword,
      destinationUrl: page.url,
      destinationTitle: displayTitle(page),
      suggestedAnchor: suggestedAnchor(page),
      reason: reason(page, target),
      placement: placement(
        targetInspection.bodyText,
        `${displayTitle(page)} ${page.metaDescription ?? ""}`,
      ),
    }));

  return {
    status: "ready",
    audit: {
      id: audit.id,
      completedAt: audit.completedAt,
      pagesCrawled: audit.pagesCrawled,
    },
    pagesConsidered: uniquePages.length,
    pagesAnalyzed: readablePages.length,
    existingIncomingLinks,
    existingOutgoingLinks,
    suggestions: [...incoming, ...outgoing],
  };
}

export const PageOptimizerInternalLinksService = { suggest };
