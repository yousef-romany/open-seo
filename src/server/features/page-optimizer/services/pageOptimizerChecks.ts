import type { PageOptimizerCheck } from "@/shared/page-optimizer";

const TITLE_MIN_CHARS = 30;
const TITLE_MAX_CHARS = 60;
const META_MIN_CHARS = 70;
const META_MAX_CHARS = 160;
const THIN_CONTENT_WORDS = 150;

interface OptimizerCheckInput {
  keyword: string;
  title: string;
  metaDescription: string;
  h1s: string[];
  wordCount: number;
  keywordOccurrences: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  internalLinks: number;
  indexable: boolean;
  canonical: string | null;
  pageUrl: string;
  javascriptShell: boolean;
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  return trimmed
    ? `${trimmed.charAt(0).toLocaleUpperCase()}${trimmed.slice(1)}`
    : "";
}

function inferBrand(title: string, pageUrl: string): string {
  const titleParts = title
    .split(/\s(?:\||–|—|-)\s/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length <= 32);
  const titleBrand = titleParts.reduce<string | undefined>(
    (shortest, part) =>
      !shortest || part.length < shortest.length ? part : shortest,
    undefined,
  );
  if (titleBrand) return titleBrand;

  try {
    const hostname = new URL(pageUrl).hostname.replace(/^www\./, "");
    return hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function suggestTitle(input: OptimizerCheckInput): string {
  const keyword = capitalizeFirst(input.keyword);
  const brand = inferBrand(input.title, input.pageUrl);
  const includesBrand = normalizeForMatch(keyword).includes(
    normalizeForMatch(brand),
  );
  const suggestion =
    brand && !includesBrand ? `${keyword} | ${brand}` : keyword;
  return suggestion.length <= TITLE_MAX_CHARS ? suggestion : keyword;
}

export function countKeywordOccurrences(
  text: string,
  targetKeyword: string,
): number {
  const normalizedText = normalizeForMatch(text);
  const normalizedKeyword = normalizeForMatch(targetKeyword);
  if (!normalizedKeyword) return 0;
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = normalizedText.match(
    new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"),
  );
  return matches?.length ?? 0;
}

function buildHeadChecks(input: OptimizerCheckInput): PageOptimizerCheck[] {
  const titleKeywordCount = countKeywordOccurrences(input.title, input.keyword);
  const metaKeywordCount = countKeywordOccurrences(
    input.metaDescription,
    input.keyword,
  );
  const titleLengthGood =
    input.title.length >= TITLE_MIN_CHARS &&
    input.title.length <= TITLE_MAX_CHARS;
  const metaGood =
    metaKeywordCount > 0 &&
    input.metaDescription.length >= META_MIN_CHARS &&
    input.metaDescription.length <= META_MAX_CHARS;
  const canonicalPointsAway =
    input.canonical !== null && input.canonical !== input.pageUrl;

  return [
    {
      id: "indexability",
      label: "Indexability",
      status: input.indexable ? "pass" : "review",
      priority: "high",
      summary: input.indexable
        ? "The page allows search engines to index it."
        : "The page asks search engines not to index it.",
      why: "A noindex directive can keep the page out of search results completely.",
      recommendation: input.indexable
        ? "No change needed."
        : "If this page should rank, remove the noindex directive before optimizing anything else.",
    },
    {
      id: "title-keyword",
      label: "Keyword in page title",
      status: titleKeywordCount > 0 ? "pass" : "improve",
      priority: "high",
      summary:
        titleKeywordCount > 0
          ? "The page title uses the target keyword."
          : "The page title does not use the target keyword.",
      why: "The title is one of the clearest signals of the page topic and often becomes the main search-result link.",
      recommendation:
        titleKeywordCount > 0
          ? "Keep it readable and specific to this page."
          : "Use the target keyword naturally near the beginning of a unique page title.",
      current: input.title || "No title found",
      suggestion: titleKeywordCount > 0 ? undefined : suggestTitle(input),
    },
    {
      id: "title-length",
      label: "Page title length",
      status: titleLengthGood ? "pass" : "improve",
      priority: "medium",
      summary: input.title
        ? `The title is ${input.title.length} characters.`
        : "The page has no title.",
      why: "A clear, readable title helps people understand the result before they click.",
      recommendation: titleLengthGood
        ? "The title is within the useful 30–60 character range."
        : "Write a clear title of roughly 30–60 characters; search results may rewrite or truncate titles outside this range.",
      current: input.title || "No title found",
      suggestion: titleLengthGood ? undefined : suggestTitle(input),
    },
    {
      id: "meta-description",
      label: "Search description",
      status: metaGood ? "pass" : "improve",
      priority: "medium",
      summary: input.metaDescription
        ? `${input.metaDescription.length} characters; ${metaKeywordCount > 0 ? "includes" : "does not include"} the target keyword.`
        : "The page has no meta description.",
      why: "A useful description can make the search result more relevant and persuasive, even though Google may rewrite it.",
      recommendation:
        "Write a useful 70–160 character description that includes the target keyword naturally and gives a reason to click.",
      current: input.metaDescription || "No meta description found",
    },
    {
      id: "canonical",
      label: "Canonical URL",
      status: canonicalPointsAway ? "review" : "pass",
      priority: "high",
      summary: canonicalPointsAway
        ? "The page points search engines to a different canonical URL."
        : "The page is self-canonical or has no conflicting canonical.",
      why: "A canonical pointing elsewhere tells search engines that another URL is the preferred version.",
      recommendation: canonicalPointsAway
        ? "If this page should rank, change the canonical to this page's final URL. If the alternate URL is intentional, optimize that page instead."
        : "No change needed.",
      current: input.canonical ?? "No canonical tag found",
    },
  ];
}

function buildContentChecks(input: OptimizerCheckInput): PageOptimizerCheck[] {
  const h1KeywordCount = input.h1s.reduce(
    (sum, h1) => sum + countKeywordOccurrences(h1, input.keyword),
    0,
  );
  const h1Summary =
    input.h1s.length === 0
      ? "The page has no H1."
      : input.h1s.length > 1
        ? `The page has ${input.h1s.length} H1 headings.`
        : h1KeywordCount > 0
          ? "The single H1 uses the target keyword."
          : "The H1 does not use the target keyword.";

  return [
    {
      id: "h1",
      label: "Main heading (H1)",
      status: input.h1s.length === 1 && h1KeywordCount > 0 ? "pass" : "improve",
      priority: "high",
      summary: h1Summary,
      why: "The main heading confirms the page topic for visitors and gives the content a clear starting point.",
      recommendation:
        "Use one clear H1 that describes the page and includes the target keyword naturally.",
      current: input.h1s.length > 0 ? input.h1s.join(" · ") : "No H1 found",
      suggestion:
        input.h1s.length === 1 && h1KeywordCount > 0
          ? undefined
          : capitalizeFirst(input.keyword),
    },
    {
      id: "content-keyword",
      label: "Keyword in page content",
      status: input.keywordOccurrences > 0 ? "pass" : "improve",
      priority: "high",
      summary:
        input.keywordOccurrences > 0
          ? `The exact phrase appears ${input.keywordOccurrences} ${input.keywordOccurrences === 1 ? "time" : "times"} in the visible content.`
          : "The exact phrase does not appear in the visible content.",
      why: "Using the phrase where it helps the reader confirms that the page actually covers the searched topic.",
      recommendation:
        input.keywordOccurrences > 0
          ? "Focus on answering the search intent; there is no target keyword density."
          : "Use the phrase naturally where it helps the reader, then cover closely related questions and terms.",
    },
    {
      id: "content-depth",
      label: "Content depth",
      status: input.wordCount >= THIN_CONTENT_WORDS ? "pass" : "review",
      priority: "medium",
      summary: `The page contains about ${input.wordCount.toLocaleString()} visible words.`,
      why: "A page needs enough useful information to satisfy the search intent, but extra words alone do not improve rankings.",
      recommendation:
        input.wordCount >= THIN_CONTENT_WORDS
          ? "Judge depth against the search intent; more words are useful only when they answer something important."
          : "This may be thin for an indexable page. Add useful information or consolidate it into a stronger page.",
    },
    {
      id: "image-alt",
      label: "Image descriptions",
      status: input.imagesMissingAlt === 0 ? "pass" : "improve",
      priority: "medium",
      summary:
        input.imagesTotal === 0
          ? "The page has no images."
          : `${input.imagesMissingAlt} of ${input.imagesTotal} images are missing an alt attribute.`,
      why: "Alt text helps people using screen readers and helps search engines understand meaningful images.",
      recommendation:
        input.imagesMissingAlt === 0
          ? "No change needed."
          : "Add descriptive alt text to meaningful images; use an empty alt only for decorative images.",
    },
    {
      id: "internal-links",
      label: "Internal links",
      status: input.internalLinks > 0 ? "pass" : "improve",
      priority: "low",
      summary: `The page links to ${input.internalLinks} internal ${input.internalLinks === 1 ? "page" : "pages"}.`,
      why: "Relevant internal links help visitors continue their journey and help search engines discover related pages.",
      recommendation:
        input.internalLinks > 0
          ? "Keep links relevant and use descriptive anchor text."
          : "Add useful links to related pages so visitors and search engines can continue through the site.",
    },
  ];
}

export function buildPageOptimizerChecks(
  input: OptimizerCheckInput,
): PageOptimizerCheck[] {
  const headChecks = buildHeadChecks(input);
  if (!input.javascriptShell) {
    return [...headChecks, ...buildContentChecks(input)];
  }
  return [
    ...headChecks,
    {
      id: "javascript-content",
      label: "Rendered page content",
      status: "review",
      priority: "high",
      summary:
        "The initial HTML looks like an app shell, so content checks are incomplete.",
      why: "If important content is missing from the initial HTML, some crawlers may see an incomplete page.",
      recommendation:
        "Make the main content available in the initial HTML with server-side rendering or prerendering, then run the optimizer again.",
    },
  ];
}
