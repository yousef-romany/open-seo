import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  ListChecks,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import {
  LoadingState,
  SourceNotices,
  StartHere,
  SummaryCard,
  WeeklyPlan,
} from "@/client/features/action-center/ActionCenterParts";
import {
  CompletedActions,
  LabelGuide,
} from "@/client/features/action-center/ActionCenterGuide";
import {
  getActionCenterReport,
  updateActionCenterStatus,
} from "@/serverFunctions/actionCenter";
import type {
  SeoActionCenterReport,
  SeoActionStatus,
} from "@/shared/action-center";

function applyStatus(
  report: SeoActionCenterReport,
  actionKey: string,
  status: SeoActionStatus,
): SeoActionCenterReport {
  const actions = report.actions.map((action) =>
    action.key === actionKey ? { ...action, status } : action,
  );
  const ordered = [
    ...actions.filter((action) => action.status === "in_progress"),
    ...actions.filter((action) => action.status === "todo"),
    ...actions.filter((action) => action.status === "done"),
  ];
  const open = ordered.filter((action) => action.status !== "done");
  return {
    ...report,
    actions: ordered,
    startHere: open.slice(0, 3),
    weeklyPlan: open.slice(0, 7),
    summary: {
      ...report.summary,
      todo: ordered.filter((action) => action.status === "todo").length,
      inProgress: ordered.filter((action) => action.status === "in_progress")
        .length,
      done: ordered.filter((action) => action.status === "done").length,
      highImpact: open.filter((action) => action.impact === "high").length,
    },
  };
}

export function ActionCenterPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["action-center", projectId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getActionCenterReport({ data: { projectId } }),
    staleTime: 30 * 60_000,
    retry: false,
  });
  const statusMutation = useMutation({
    mutationFn: (input: { actionKey: string; status: SeoActionStatus }) =>
      updateActionCenterStatus({ data: { projectId, ...input } }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<SeoActionCenterReport>(queryKey);
      if (previous) {
        queryClient.setQueryData(
          queryKey,
          applyStatus(previous, input.actionKey, input.status),
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
  });
  const report = query.data;

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="SEO Action Center"
          description="Your prioritized SEO plan, built from the problems and opportunities OpenSEO has already found."
          actions={
            report ? (
              <Button
                variant="outline"
                pending={query.isFetching}
                onClick={() => void query.refetch()}
              >
                <RefreshCw data-icon="inline-start" />
                Refresh plan
              </Button>
            ) : null
          }
        />

        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <QueryError
            error={query.error}
            fallback="We couldn't build your SEO action plan."
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
            variant="page"
          />
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Ready to do"
                value={report.summary.todo}
                icon={<ListChecks className="size-5" />}
              />
              <SummaryCard
                label="In progress"
                value={report.summary.inProgress}
                icon={<Clock3 className="size-5" />}
                tone="info"
              />
              <SummaryCard
                label="High impact"
                value={report.summary.highImpact}
                icon={<TriangleAlert className="size-5" />}
                tone="warning"
              />
              <SummaryCard
                label="Completed"
                value={report.summary.done}
                icon={<CheckCircle2 className="size-5" />}
                tone="success"
              />
            </div>

            <SourceNotices projectId={projectId} report={report} />

            {report.actions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No actionable issues found yet"
                description="Run a Site Audit or connect Search Console so OpenSEO can build a prioritized plan from real site data."
              />
            ) : report.startHere.length === 0 ? (
              <Card className="py-10 text-center">
                <CardContent>
                  <CheckCircle2 className="mx-auto size-9 text-success" />
                  <h2 className="mt-3 text-lg font-semibold">
                    Current opportunities completed
                  </h2>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                    Refresh the plan after new Search Console data or a new Site
                    Audit to find the next actions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <StartHere
                projectId={projectId}
                actions={report.startHere}
                mutation={statusMutation}
              />
            )}

            {report.weeklyPlan.length > 0 ? (
              <WeeklyPlan
                projectId={projectId}
                actions={report.weeklyPlan}
                mutation={statusMutation}
              />
            ) : null}

            <LabelGuide />

            {report.actions.some((action) => action.status === "done") ? (
              <CompletedActions
                actions={report.actions.filter(
                  (action) => action.status === "done",
                )}
                mutation={statusMutation}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
