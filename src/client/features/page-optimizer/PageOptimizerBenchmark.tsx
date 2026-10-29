import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Search,
  Sparkles,
} from "lucide-react";
import { QueryError } from "@/client/components/QueryState";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { PageOptimizerContentBrief } from "@/client/features/page-optimizer/PageOptimizerContentBrief";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { benchmarkPage } from "@/serverFunctions/page-optimizer";
import type {
  PageOptimizerBenchmark as BenchmarkResult,
  PageOptimizerBenchmarkInsight,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const CACHE_TIME_MS = 12 * 60 * 60 * 1000;

export function PageOptimizerBenchmark({
  projectId,
  result,
  onBenchmarkChange,
}: {
  projectId: string;
  result: PageOptimizerSuccess;
  onBenchmarkChange?: (benchmark: BenchmarkResult) => void;
}) {
  const [requested, setRequested] = useState(false);
  const query = useQuery({
    queryKey: [
      "page-optimizer-benchmark",
      projectId,
      result.url,
      result.targetKeyword,
    ],
    queryFn: () =>
      benchmarkPage({
        data: {
          projectId,
          url: result.url,
          targetKeyword: result.targetKeyword,
        },
      }),
    enabled: false,
    staleTime: CACHE_TIME_MS,
    gcTime: CACHE_TIME_MS,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const runBenchmark = () => {
    setRequested(true);
    void query.refetch();
  };

  useEffect(() => {
    if (query.data) onBenchmarkChange?.(query.data);
  }, [onBenchmarkChange, query.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <h2>Competitor benchmark</h2>
        </CardTitle>
        <CardDescription>
          Compare this page with the top organic results for “
          {result.targetKeyword}”.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.data ? (
          <BenchmarkDetails benchmark={query.data} result={result} />
        ) : query.isError && requested ? (
          <QueryError
            error={query.error}
            fallback="We couldn't compare the ranking pages."
            onRetry={runBenchmark}
            isRetrying={query.isFetching}
            variant="inline"
          />
        ) : (
          <div className="rounded-lg border border-border bg-foreground/[0.02] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="font-medium">
                  See what the pages already ranking are doing differently.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  OpenSEO checks up to five competitors, then compares content
                  depth, titles, H1s, structured data, and repeated topics.
                  Fresh Google results cost about 5 credits; a cached search
                  uses no extra credits.
                </p>
              </div>
              <Button
                type="button"
                onClick={runBenchmark}
                pending={query.isFetching}
              >
                <Search data-icon="inline-start" />
                Run competitor benchmark
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BenchmarkDetails({
  benchmark,
  result,
}: {
  benchmark: BenchmarkResult;
  result: PageOptimizerSuccess;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <BenchmarkMetric
          label="Competitors analyzed"
          value={`${benchmark.analyzedCompetitorCount}/${benchmark.competitors.length}`}
        />
        <BenchmarkMetric
          label="Your visible words"
          value={benchmark.page.wordCount.toLocaleString()}
        />
        <BenchmarkMetric
          label="Competitor median"
          value={benchmark.medianWordCount?.toLocaleString() ?? "Not available"}
        />
      </div>

      <section>
        <div className="mb-3">
          <h3 className="font-semibold">What the comparison means</h3>
          <p className="text-sm text-muted-foreground">
            Use these patterns as evidence, not rules. Relevance and usefulness
            matter more than copying a competitor.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {benchmark.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      <PageOptimizerContentBrief benchmark={benchmark} result={result} />

      <section>
        <div className="mb-3 flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 text-primary" />
          <div>
            <h3 className="font-semibold">Topics competitors mention</h3>
            <p className="text-sm text-muted-foreground">
              These phrases appear across multiple ranking pages but were not
              found on yours. Add a topic only when it helps the visitor.
            </p>
          </div>
        </div>
        {benchmark.topicGaps.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {benchmark.topicGaps.map((topic) => (
              <div
                key={topic.phrase}
                className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{topic.phrase}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {topic.competitorCount} pages
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            No repeated topic gap was clear from the pages OpenSEO could read.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h3 className="font-semibold">Ranking pages checked</h3>
          <p className="text-sm text-muted-foreground">
            “Could not read” usually means the website blocked automated page
            access; its Google result is still shown.
          </p>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {benchmark.competitors.map((competitor) => (
            <div
              key={`${competitor.rank}-${competitor.url}`}
              className="grid gap-3 px-3 py-3 lg:grid-cols-[2rem_minmax(0,1fr)_auto] lg:items-center"
            >
              <span className="text-sm font-semibold text-muted-foreground">
                #{competitor.rank}
              </span>
              <div className="min-w-0">
                <SafeExternalLink
                  url={competitor.url}
                  label={competitor.serpTitle || competitor.domain}
                  className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
                />
                <p className="truncate text-xs text-muted-foreground">
                  {competitor.domain}
                </p>
                {competitor.h1 ? (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    H1: {competitor.h1}
                  </p>
                ) : null}
              </div>
              {competitor.analyzed ? (
                <div className="flex flex-wrap gap-2 text-xs lg:justify-end">
                  <Badge variant="outline">
                    {competitor.wordCount?.toLocaleString()} words
                  </Badge>
                  <Badge variant="outline">
                    keyword {competitor.keywordOccurrences ?? 0}×
                  </Badge>
                </div>
              ) : (
                <Badge variant="warning">Could not read</Badge>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Compared {formatDate(benchmark.comparedAt)} using the project's search
        market. Google results can change by location, device, and time.
      </p>
    </div>
  );
}

function BenchmarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: PageOptimizerBenchmarkInsight }) {
  const strong = insight.status === "strong";
  const review = insight.status === "review";
  const Icon = strong ? CheckCircle2 : CircleAlert;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon
          className={`size-4 ${strong ? "text-success" : review ? "text-info" : "text-warning"}`}
        />
        <h4 className="font-medium">{insight.title}</h4>
        <Badge
          variant={strong ? "success" : review ? "info" : "warning"}
          className="ml-auto"
        >
          {strong ? "Strong" : review ? "Review" : "Opportunity"}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{insight.summary}</p>
      <p className="mt-2 text-sm">
        <span className="font-medium">Do this: </span>
        <span className="text-foreground/80">{insight.action}</span>
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
