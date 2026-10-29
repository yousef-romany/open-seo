import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  GitMerge,
  RefreshCw,
  SearchCheck,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import {
  ConflictTable,
  DecisionGuide,
  StartHereConflict,
  SummaryCard,
} from "@/client/features/keyword-cannibalization/KeywordCannibalizationParts";
import { formatCount } from "@/client/features/search-performance/SearchPerformanceColumns";
import { getKeywordCannibalizationReport } from "@/serverFunctions/keywordCannibalization";

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
      aria-label="Loading keyword cannibalization report"
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

export function KeywordCannibalizationPage({
  projectId,
}: {
  projectId: string;
}) {
  const query = useQuery({
    queryKey: ["keywordCannibalizationReport", projectId],
    queryFn: () => getKeywordCannibalizationReport({ data: { projectId } }),
    staleTime: 60 * 60_000,
  });
  const result = query.data;
  const report = result?.connected ? result.report : null;

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Keyword Cannibalization"
          description="Find queries where multiple pages compete, choose the primary page, and see the safest next step."
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
            fallback="We couldn't check your competing pages."
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
                label="Potential overlaps"
                value={formatCount(report.summary.conflictingQueries)}
                description={`Out of ${formatCount(report.queriesAnalyzed)} queries checked.`}
                icon={<GitMerge className="size-5" />}
              />
              <SummaryCard
                label="Affected pages"
                value={formatCount(report.summary.affectedPages)}
                description="Pages appearing in at least one potential overlap."
                icon={<SearchCheck className="size-5" />}
              />
              <SummaryCard
                label="High priority"
                value={formatCount(report.summary.highPriority)}
                description="Resolve these first because they have the most visibility."
                icon={<TriangleAlert className="size-5" />}
              />
              <SummaryCard
                label="Impressions involved"
                value={formatCount(report.summary.impressionsInvolved)}
                description={`${formatDate(report.range.startDate)}–${formatDate(report.range.endDate)}`}
                icon={<Eye className="size-5" />}
              />
            </div>

            {report.conflicts.length === 0 ? (
              <Card className="py-10 text-center">
                <CardContent>
                  <SearchCheck className="mx-auto size-9 text-success" />
                  <h2 className="mt-3 text-lg font-semibold">
                    No meaningful page conflicts found
                  </h2>
                  <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                    Google currently has a clear page for the queries with
                    enough data to evaluate. Check again as more Search Console
                    data arrives.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <section
                  className="space-y-3"
                  aria-labelledby="conflicts-start-title"
                >
                  <div>
                    <h2
                      id="conflicts-start-title"
                      className="text-lg font-semibold"
                    >
                      Start here
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Review these signals first. Open either page in Page
                      Optimizer with the shared query already filled in.
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {report.conflicts.slice(0, 3).map((conflict, index) => (
                      <StartHereConflict
                        key={conflict.query}
                        projectId={projectId}
                        conflict={conflict}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                </section>
                <DecisionGuide />
                <ConflictTable
                  projectId={projectId}
                  conflicts={report.conflicts}
                />
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
