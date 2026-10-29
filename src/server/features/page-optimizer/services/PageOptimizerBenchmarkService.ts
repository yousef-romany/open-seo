import type { BillingCustomerContext } from "@/server/billing/subscription";
import { sort } from "remeda";
import { KeywordResearchService } from "@/server/features/keywords/services/KeywordResearchService";
import { PageOptimizerService } from "@/server/features/page-optimizer/services/PageOptimizerService";
import { findBenchmarkTopicGaps } from "@/server/features/page-optimizer/services/pageOptimizerBenchmarkTopics";
import { countKeywordOccurrences } from "@/server/features/page-optimizer/services/pageOptimizerChecks";
import type {
  PageOptimizerBenchmark,
  PageOptimizerBenchmarkCompetitor,
  PageOptimizerBenchmarkInsight,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const COMPETITOR_LIMIT = 5;

type BenchmarkInput = {
  projectId: string;
  url: string;
  targetKeyword: string;
  locationCode: number;
  languageCode: string;
};

function hostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isSameSite(first: string, second: string): boolean {
  const a = hostname(first);
  const b = hostname(second);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = sort(values, (a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

function buildInsights(input: {
  page: PageOptimizerSuccess;
  competitorCount: number;
  medianWordCount: number | null;
  titleKeywordCount: number;
  h1KeywordCount: number;
  structuredDataCount: number;
}): PageOptimizerBenchmarkInsight[] {
  const page = input.page.page;
  if (input.competitorCount === 0) {
    return [
      {
        id: "content-depth",
        status: "review",
        title: "Content depth",
        summary:
          "None of the ranking pages could be read for an on-page comparison.",
        action:
          "Use the search-result titles below to review intent, then try the comparison again later.",
      },
      {
        id: "title-pattern",
        status: "review",
        title: "Keyword in title",
        summary:
          "There is not enough competitor page data to identify a reliable title pattern.",
        action:
          "Keep your title specific, readable, and aligned with the search intent.",
      },
      {
        id: "h1-pattern",
        status: "review",
        title: "Keyword in main heading",
        summary:
          "There is not enough competitor page data to identify a reliable H1 pattern.",
        action: "Use one clear H1 that states the page's main promise.",
      },
      {
        id: "structured-data",
        status: "review",
        title: "Structured data",
        summary:
          "There is not enough competitor page data to compare structured data usage.",
        action:
          "Add schema only when a supported type accurately describes this page.",
      },
    ];
  }
  const majority = Math.ceil(input.competitorCount / 2);
  const titleUsesKeyword =
    countKeywordOccurrences(page.title, input.page.targetKeyword) > 0;
  const h1UsesKeyword = page.h1s.some(
    (heading) => countKeywordOccurrences(heading, input.page.targetKeyword) > 0,
  );

  const depthInsight: PageOptimizerBenchmarkInsight =
    input.medianWordCount === null
      ? {
          id: "content-depth",
          status: "review",
          title: "Content depth",
          summary:
            "Not enough competitor pages could be read to calculate a useful benchmark.",
          action:
            "Open the ranking pages below and compare the questions and decisions they help visitors answer.",
        }
      : page.wordCount < input.medianWordCount * 0.7 &&
          input.medianWordCount - page.wordCount >= 150
        ? {
            id: "content-depth",
            status: "opportunity",
            title: "Content depth",
            summary: `Your page has ${page.wordCount.toLocaleString()} visible words; the analyzed competitors have a median of ${input.medianWordCount.toLocaleString()}.`,
            action:
              "Review the missing topics below and add only sections that help the visitor make a decision. Do not add words just to match the median.",
          }
        : {
            id: "content-depth",
            status: "strong",
            title: "Content depth",
            summary: `Your page has ${page.wordCount.toLocaleString()} visible words versus a competitor median of ${input.medianWordCount.toLocaleString()}.`,
            action:
              "Keep the page focused on search intent; useful coverage matters more than matching a word count.",
          };

  const titleInsight: PageOptimizerBenchmarkInsight =
    input.titleKeywordCount >= majority && !titleUsesKeyword
      ? {
          id: "title-pattern",
          status: "opportunity",
          title: "Keyword in title",
          summary: `${input.titleKeywordCount} of ${input.competitorCount} analyzed competitors use the exact keyword in their title; your page does not.`,
          action:
            "Use the keyword naturally near the beginning of a title that still explains what makes this page useful.",
        }
      : {
          id: "title-pattern",
          status: titleUsesKeyword ? "strong" : "review",
          title: "Keyword in title",
          summary: titleUsesKeyword
            ? `Your title uses the keyword; ${input.titleKeywordCount} of ${input.competitorCount} competitors do too.`
            : `Only ${input.titleKeywordCount} of ${input.competitorCount} analyzed competitors use the exact keyword in their title.`,
          action: titleUsesKeyword
            ? "Keep the title specific and readable."
            : "Choose the clearest title for the search intent; exact-match wording is not mandatory when the meaning is obvious.",
        };

  const h1Insight: PageOptimizerBenchmarkInsight =
    input.h1KeywordCount >= majority && !h1UsesKeyword
      ? {
          id: "h1-pattern",
          status: "opportunity",
          title: "Keyword in main heading",
          summary: `${input.h1KeywordCount} of ${input.competitorCount} analyzed competitors use the exact keyword in their H1; your page does not.`,
          action:
            "Rewrite the main heading so it states the page topic clearly and includes the keyword naturally.",
        }
      : {
          id: "h1-pattern",
          status: h1UsesKeyword ? "strong" : "review",
          title: "Keyword in main heading",
          summary: h1UsesKeyword
            ? `Your H1 uses the keyword; ${input.h1KeywordCount} of ${input.competitorCount} competitors do too.`
            : `Only ${input.h1KeywordCount} of ${input.competitorCount} analyzed competitors use the exact keyword in their H1.`,
          action: h1UsesKeyword
            ? "Keep one clear H1 that matches the page's promise."
            : "Use a clear H1 that describes the offer; add the exact phrase only when it reads naturally.",
        };

  const structuredInsight: PageOptimizerBenchmarkInsight =
    input.structuredDataCount >= majority && !page.hasStructuredData
      ? {
          id: "structured-data",
          status: "opportunity",
          title: "Structured data",
          summary: `${input.structuredDataCount} of ${input.competitorCount} analyzed competitors include structured data; your page does not.`,
          action:
            "Inspect which schema types fit this page and add only markup that accurately represents visible content.",
        }
      : {
          id: "structured-data",
          status: page.hasStructuredData ? "strong" : "review",
          title: "Structured data",
          summary: page.hasStructuredData
            ? `Your page includes structured data; ${input.structuredDataCount} of ${input.competitorCount} competitors do too.`
            : `${input.structuredDataCount} of ${input.competitorCount} analyzed competitors include structured data.`,
          action: page.hasStructuredData
            ? "Validate the markup and keep it consistent with visible page content."
            : "Add schema only when a supported type accurately describes this page.",
        };

  return [depthInsight, titleInsight, h1Insight, structuredInsight];
}

async function benchmark(
  input: BenchmarkInput,
  billingCustomer: BillingCustomerContext,
): Promise<PageOptimizerBenchmark> {
  const serp = await KeywordResearchService.getSerpAnalysis(
    {
      projectId: input.projectId,
      keyword: input.targetKeyword,
      locationCode: input.locationCode,
      languageCode: input.languageCode,
      depth: 20,
    },
    billingCustomer,
  );
  const candidates = serp.items
    .filter((item) => item.url && !isSameSite(item.url, input.url))
    .slice(0, COMPETITOR_LIMIT);

  const [pageInspection, ...competitorInspections] = await Promise.all([
    PageOptimizerService.inspect({
      url: input.url,
      targetKeyword: input.targetKeyword,
    }),
    ...candidates.map((item) =>
      PageOptimizerService.inspect({
        url: item.url,
        targetKeyword: input.targetKeyword,
      }),
    ),
  ]);
  if (!pageInspection?.result.ok) {
    throw new Error("The page could not be read for competitor comparison.");
  }

  const competitorDetails = candidates.map((item, index) => {
    const inspection = competitorInspections[index];
    const page = inspection?.result.ok ? inspection.result : null;
    const result: PageOptimizerBenchmarkCompetitor = {
      rank: item.rank,
      domain: item.domain,
      url: item.url,
      serpTitle: item.title,
      serpDescription: item.description,
      analyzed: page !== null,
      title: page?.page.title ?? null,
      h1: page?.page.h1s[0] ?? null,
      wordCount: page?.page.wordCount ?? null,
      keywordOccurrences: page?.page.keywordOccurrences ?? null,
      hasStructuredData: page?.page.hasStructuredData ?? null,
    };
    return { result, page };
  });
  const analyzed = competitorDetails.filter(
    (competitor) => competitor.page !== null,
  );
  const medianWordCount = median(
    analyzed.flatMap((competitor) =>
      competitor.page ? [competitor.page.page.wordCount] : [],
    ),
  );
  const titleKeywordCount = analyzed.filter(
    (competitor) =>
      competitor.page &&
      countKeywordOccurrences(competitor.page.page.title, input.targetKeyword) >
        0,
  ).length;
  const h1KeywordCount = analyzed.filter(
    (competitor) =>
      competitor.page?.page.h1s.some(
        (heading) => countKeywordOccurrences(heading, input.targetKeyword) > 0,
      ) === true,
  ).length;
  const structuredDataCount = analyzed.filter(
    (competitor) => competitor.page?.page.hasStructuredData === true,
  ).length;
  const page = pageInspection.result;
  const pageText = [
    page.page.title,
    page.page.metaDescription,
    page.page.h1s.join(" "),
    pageInspection.bodyText,
  ].join(" ");

  return {
    keyword: input.targetKeyword.trim(),
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    comparedAt: new Date().toISOString(),
    page: {
      url: page.url,
      wordCount: page.page.wordCount,
      keywordOccurrences: page.page.keywordOccurrences,
      titleUsesKeyword:
        countKeywordOccurrences(page.page.title, input.targetKeyword) > 0,
      h1UsesKeyword: page.page.h1s.some(
        (heading) => countKeywordOccurrences(heading, input.targetKeyword) > 0,
      ),
      hasStructuredData: page.page.hasStructuredData,
    },
    competitors: competitorDetails.map((competitor) => competitor.result),
    analyzedCompetitorCount: analyzed.length,
    medianWordCount,
    competitorsUsingKeywordInTitle: titleKeywordCount,
    competitorsUsingKeywordInH1: h1KeywordCount,
    competitorsUsingStructuredData: structuredDataCount,
    topicGaps: findBenchmarkTopicGaps(
      pageText,
      input.targetKeyword,
      competitorDetails,
    ),
    insights: buildInsights({
      page,
      competitorCount: analyzed.length,
      medianWordCount,
      titleKeywordCount,
      h1KeywordCount,
      structuredDataCount,
    }),
  };
}

export const PageOptimizerBenchmarkService = { benchmark } as const;
