import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  MousePointerClick,
  RefreshCw,
  SearchCheck,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  MetricGuide,
  OpportunitiesTable,
  StartHereCard,
  SummaryCard,
} from "@/client/features/content-refresh/ContentRefreshParts";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { formatCount } from "@/client/features/search-performance/SearchPerformanceColumns";
import { getContentRefreshReport } from "@/serverFunctions/contentRefresh";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}

function LoadingState() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading content refresh report"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export function ContentRefreshPage({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["contentRefreshReport", projectId],
    queryFn: () => getContentRefreshReport({ data: { projectId } }),
    staleTime: 60 * 60_000,
  });
  const result = query.data;
  const report = result?.connected ? result.report : null;

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Content Refresh Monitor"
          description="Find pages losing organic traffic, understand why, and open the right fix in Page Optimizer."
          actions={
            result?.connected ? (
              <Button
                variant="outline"
                pending={query.isFetching}
                onClick={() => void query.refetch()}
              >
                <RefreshCw data-icon="inline-start" />
                Refresh data
              </Button>
            ) : null
          }
        />

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            fallback="We couldn't compare your Search Console periods."
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
            variant="page"
          />
        ) : !result?.connected ? (
          <div className="max-w-2xl">
            <GoogleConnectionCard provider="gsc" projectId={projectId} />
          </div>
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Estimated clicks lost"
                value={formatCount(report.summary.lostClicks)}
                description="Across the declining pages below."
                icon={<MousePointerClick className="size-5" />}
              />
              <SummaryCard
                label="Pages to refresh"
                value={formatCount(report.summary.pagesDeclining)}
                description={`Out of ${formatCount(report.pagesAnalyzed)} pages checked.`}
                icon={<SearchCheck className="size-5" />}
              />
              <SummaryCard
                label="High priority"
                value={formatCount(report.summary.highPriority)}
                description="Start with these for the biggest likely recovery."
                icon={<TriangleAlert className="size-5" />}
              />
              <SummaryCard
                label="Comparison"
                value="28 vs 28 days"
                description={`${formatDate(report.range.startDate)}–${formatDate(report.range.endDate)} vs ${formatDate(report.range.previousStartDate)}–${formatDate(report.range.previousEndDate)}`}
                icon={<ArrowDownRight className="size-5" />}
              />
            </div>

            {report.opportunities.length === 0 ? (
              <Card className="py-10 text-center">
                <CardContent>
                  <SearchCheck className="mx-auto size-9 text-success" />
                  <h2 className="mt-3 text-lg font-semibold">
                    No meaningful traffic decline found
                  </h2>
                  <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                    None of the pages checked lost enough clicks to need a
                    refresh right now. Check again after more Search Console
                    data arrives.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <section
                  className="space-y-3"
                  aria-labelledby="start-here-title"
                >
                  <div>
                    <h2 id="start-here-title" className="text-lg font-semibold">
                      Start here
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Fix these pages first. Open Page Optimizer to turn each
                      recommendation into a step-by-step action plan.
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {report.opportunities.slice(0, 3).map((item, index) => (
                      <StartHereCard
                        key={item.url}
                        projectId={projectId}
                        opportunity={item}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                </section>
                <MetricGuide />
                <OpportunitiesTable
                  projectId={projectId}
                  opportunities={report.opportunities}
                />
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
