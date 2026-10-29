import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChartNoAxesCombined,
  Clock3,
  RefreshCw,
  SearchCheck,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { getSeoResultsReport } from "@/serverFunctions/seoResults";
import type { SeoResultTracker } from "@/shared/page-optimizer";

const STATUS_DETAILS: Record<
  SeoResultTracker["status"],
  { label: string; variant: "outline" | "success" | "warning" | "info" }
> = {
  waiting: { label: "Collecting data", variant: "outline" },
  improving: { label: "Improving", variant: "success" },
  steady: { label: "Steady", variant: "info" },
  needs_attention: { label: "Needs attention", variant: "warning" },
};

function formatPercent(value: number | null, points = false): string {
  if (value === null) return "—";
  const scaled = value * 100;
  const sign = scaled > 0 ? "+" : "";
  return `${sign}${scaled.toFixed(1)}${points ? " pts" : "%"}`;
}

function formatPosition(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function SeoResultsPage({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["seo-results", projectId],
    queryFn: () => getSeoResultsReport({ data: { projectId } }),
    staleTime: 60 * 60_000,
    retry: false,
  });
  const result = query.data;
  const report = result?.connected ? result.report : null;

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="SEO Results Tracker"
          description="See whether completed Page Optimizer tasks improved clicks, visibility, CTR, or rankings in Search Console."
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
            fallback="We couldn't compare your completed SEO work."
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
              <Summary
                label="Changes tracked"
                value={report.summary.total}
                icon={<ChartNoAxesCombined className="size-5" />}
              />
              <Summary
                label="Improving"
                value={report.summary.improving}
                icon={<TrendingUp className="size-5" />}
                tone="success"
              />
              <Summary
                label="Collecting data"
                value={report.summary.waiting}
                icon={<Clock3 className="size-5" />}
              />
              <Summary
                label="Needs attention"
                value={report.summary.needsAttention}
                icon={<TriangleAlert className="size-5" />}
                tone="warning"
              />
            </div>

            <HowItWorks />

            {report.trackers.length === 0 ? (
              <Card className="py-10 text-center">
                <CardContent>
                  <SearchCheck className="mx-auto size-9 text-primary" />
                  <h2 className="mt-3 text-lg font-semibold">
                    Complete your first tracked task
                  </h2>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                    Open Page Optimizer, change an action-plan task to Done,
                    then return here. OpenSEO will start measuring the result
                    automatically.
                  </p>
                  <Button
                    className="mt-4"
                    nativeButton={false}
                    render={
                      <Link
                        to="/p/$projectId/page-optimizer"
                        params={{ projectId }}
                        search={{}}
                      />
                    }
                  >
                    Open Page Optimizer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <section className="space-y-3" aria-labelledby="tracked-title">
                <div>
                  <h2 id="tracked-title" className="text-lg font-semibold">
                    Completed changes
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Each card compares the same page and keyword before and
                    after the task was completed.
                  </p>
                </div>
                <div className="space-y-3">
                  {report.trackers.map((tracker) => (
                    <TrackerCard
                      key={`${tracker.url}:${tracker.targetKeyword}:${tracker.taskId}`}
                      projectId={projectId}
                      tracker={tracker}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading SEO results">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function Summary({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={`mt-1 text-2xl font-semibold ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : ""}`}
          >
            {value}
          </p>
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function HowItWorks() {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h2 className="font-semibold">How to read these results</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        OpenSEO waits at least 7 days, then compares equal-length periods before
        and after the change. Clicks and impressions are compared per day. A
        positive position change means the average ranking moved closer to #1.
        Search demand and seasonality can also move these numbers, so use the
        result as evidence, not absolute proof.
      </p>
    </div>
  );
}

function TrackerCard({
  projectId,
  tracker,
}: {
  projectId: string;
  tracker: SeoResultTracker;
}) {
  const status = STATUS_DETAILS[tracker.status];
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{tracker.taskTitle}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              “{tracker.targetKeyword}” · {new URL(tracker.url).pathname || "/"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                to="/p/$projectId/page-optimizer"
                params={{ projectId }}
                search={{ url: tracker.url, keyword: tracker.targetKeyword }}
              />
            }
          >
            Recheck page
          </Button>
        </div>

        {tracker.status === "waiting" ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            {tracker.daysMeasured === 0
              ? "Search Console data has not reached the completion date yet."
              : `${7 - tracker.daysMeasured} more day${7 - tracker.daysMeasured === 1 ? "" : "s"} needed before the first comparison.`}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ChangeMetric
              label="Clicks per day"
              value={formatPercent(tracker.changes.clicksPerDay)}
            />
            <ChangeMetric
              label="Impressions per day"
              value={formatPercent(tracker.changes.impressionsPerDay)}
            />
            <ChangeMetric
              label="CTR change"
              value={formatPercent(tracker.changes.ctr, true)}
            />
            <ChangeMetric
              label="Position improvement"
              value={formatPosition(tracker.changes.position)}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Marked done {new Date(tracker.completedAt).toLocaleDateString()} ·{" "}
          {tracker.daysMeasured} day{tracker.daysMeasured === 1 ? "" : "s"}{" "}
          measured
        </p>
      </CardContent>
    </Card>
  );
}

function ChangeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/15 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
