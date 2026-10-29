import { sort } from "remeda";
import type {
  PageOptimizerBenchmarkCompetitor,
  PageOptimizerSuccess,
  PageOptimizerTopicGap,
} from "@/shared/page-optimizer";

const TOPIC_GAP_LIMIT = 8;
const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const STOP_WORDS = new Set([
  "about",
  "after",
  "all",
  "and",
  "best",
  "for",
  "from",
  "guide",
  "how",
  "into",
  "more",
  "near",
  "our",
  "read",
  "the",
  "this",
  "top",
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

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string): string[] {
  const tokens: string[] = [];
  for (const part of segmenter.segment(normalizeText(value))) {
    if (!part.isWordLike) continue;
    const token = part.segment.trim();
    if (token.length < 2 || STOP_WORDS.has(token) || /^\p{N}+$/u.test(token)) {
      continue;
    }
    tokens.push(token);
  }
  return tokens;
}

function phrases(value: string): Set<string> {
  const found = new Set<string>();
  for (const section of value.split(/[.!?;:|–—-]+/u)) {
    const tokens = words(section);
    for (const size of [2, 3]) {
      for (let index = 0; index <= tokens.length - size; index++) {
        found.add(tokens.slice(index, index + size).join(" "));
      }
    }
  }
  return found;
}

export function findBenchmarkTopicGaps(
  pageText: string,
  keyword: string,
  competitors: Array<{
    result: PageOptimizerBenchmarkCompetitor;
    page: PageOptimizerSuccess | null;
  }>,
): PageOptimizerTopicGap[] {
  const pageTextNormalized = normalizeText(pageText);
  const keywordNormalized = normalizeText(keyword);
  const counts = new Map<string, number>();

  for (const competitor of competitors) {
    const source = [
      competitor.result.serpTitle,
      competitor.result.serpDescription,
      competitor.page?.page.h1s.join(" ") ?? "",
    ].join(". ");
    for (const phrase of phrases(source)) {
      if (phrase === keywordNormalized || pageTextNormalized.includes(phrase)) {
        continue;
      }
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }

  const sharedPhrases = [...counts.entries()].filter(([, count]) => count >= 2);
  return sort(
    sharedPhrases,
    ([firstPhrase, firstCount], [secondPhrase, secondCount]) => {
      if (firstCount !== secondCount) return secondCount - firstCount;
      return firstPhrase.split(" ").length - secondPhrase.split(" ").length;
    },
  )
    .slice(0, TOPIC_GAP_LIMIT)
    .map(([phrase, competitorCount]) => ({ phrase, competitorCount }));
}
