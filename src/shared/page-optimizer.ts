export type PageOptimizerCheckStatus = "pass" | "improve" | "review";
export type PageOptimizerPriority = "high" | "medium" | "low";

export interface PageOptimizerCheck {
  id: string;
  label: string;
  status: PageOptimizerCheckStatus;
  priority: PageOptimizerPriority;
  summary: string;
  why: string;
  recommendation: string;
  current?: string;
  suggestion?: string;
}

export interface PageOptimizerSuccess {
  ok: true;
  url: string;
  targetKeyword: string;
  statusCode: number;
  responseTimeMs: number;
  coverageWarning: "javascript" | null;
  page: {
    title: string;
    metaDescription: string;
    h1s: string[];
    canonical: string | null;
    indexable: boolean;
    wordCount: number;
    keywordOccurrences: number;
    imagesTotal: number;
    imagesMissingAlt: number;
    internalLinks: number;
    externalLinks: number;
    hasStructuredData: boolean;
  };
  checks: PageOptimizerCheck[];
}

export type PageOptimizerFailureReason =
  | "invalid_url"
  | "blocked_target"
  | "blocked_by_site"
  | "unreachable"
  | "http_error"
  | "not_html"
  | "too_many_redirects";

export interface PageOptimizerFailure {
  ok: false;
  reason: PageOptimizerFailureReason;
  statusCode?: number;
}

export type PageOptimizerResult = PageOptimizerSuccess | PageOptimizerFailure;

export interface PageOptimizerHistoryEntry {
  id: string;
  url: string;
  targetKeyword: string;
  title: string;
  primaryH1: string | null;
  passedCount: number;
  improveCount: number;
  reviewCount: number;
  wordCount: number;
  keywordOccurrences: number;
  createdAt: string;
}

export interface PageOptimizerBenchmarkCompetitor {
  rank: number;
  domain: string;
  url: string;
  serpTitle: string;
  serpDescription: string;
  analyzed: boolean;
  title: string | null;
  h1: string | null;
  wordCount: number | null;
  keywordOccurrences: number | null;
  hasStructuredData: boolean | null;
}

export interface PageOptimizerTopicGap {
  phrase: string;
  competitorCount: number;
}

export interface PageOptimizerBenchmarkInsight {
  id: "content-depth" | "title-pattern" | "h1-pattern" | "structured-data";
  status: "strong" | "opportunity" | "review";
  title: string;
  summary: string;
  action: string;
}

export interface PageOptimizerBenchmark {
  keyword: string;
  locationCode: number;
  languageCode: string;
  comparedAt: string;
  page: {
    url: string;
    wordCount: number;
    keywordOccurrences: number;
    titleUsesKeyword: boolean;
    h1UsesKeyword: boolean;
    hasStructuredData: boolean;
  };
  competitors: PageOptimizerBenchmarkCompetitor[];
  analyzedCompetitorCount: number;
  medianWordCount: number | null;
  competitorsUsingKeywordInTitle: number;
  competitorsUsingKeywordInH1: number;
  competitorsUsingStructuredData: number;
  topicGaps: PageOptimizerTopicGap[];
  insights: PageOptimizerBenchmarkInsight[];
}

export interface PageOptimizerInternalLinkSuggestion {
  id: string;
  direction: "to_page" | "from_page";
  sourceUrl: string;
  sourceTitle: string;
  destinationUrl: string;
  destinationTitle: string;
  suggestedAnchor: string;
  reason: string;
  placement: string;
}

export type PageOptimizerInternalLinksResult =
  | {
      status: "no_audit";
    }
  | {
      status: "ready";
      audit: {
        id: string;
        completedAt: string | null;
        pagesCrawled: number;
      };
      pagesConsidered: number;
      pagesAnalyzed: number;
      existingIncomingLinks: number;
      existingOutgoingLinks: number;
      suggestions: PageOptimizerInternalLinkSuggestion[];
    };

export type PageOptimizerTaskStatus = "todo" | "in_progress" | "done";
export type PageOptimizerTaskSource =
  | "on_page"
  | "site_audit"
  | "competitors"
  | "internal_links";

export interface PageOptimizerTaskState {
  taskId: string;
  status: PageOptimizerTaskStatus;
  updatedAt: string;
}

export interface SeoResultTracker {
  taskId: string;
  taskTitle: string;
  url: string;
  targetKeyword: string;
  completedAt: string;
  status: "waiting" | "improving" | "steady" | "needs_attention";
  daysMeasured: number;
  baseline: SeoResultMetrics | null;
  current: SeoResultMetrics | null;
  changes: {
    clicksPerDay: number | null;
    impressionsPerDay: number | null;
    ctr: number | null;
    position: number | null;
  };
}

export interface SeoResultMetrics {
  startDate: string;
  endDate: string;
  days: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoResultsReport {
  generatedAt: string;
  trackers: SeoResultTracker[];
  summary: {
    total: number;
    waiting: number;
    improving: number;
    needsAttention: number;
  };
}

export interface PageOptimizerAuditTask {
  issueType: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  action: string;
}

export interface PageOptimizerActionTask {
  id: string;
  source: PageOptimizerTaskSource;
  priority: PageOptimizerPriority;
  title: string;
  action: string;
  why: string;
  verification: string;
  suggestion?: string;
  destinationUrl?: string;
}
