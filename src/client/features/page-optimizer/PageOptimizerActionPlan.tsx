import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { PageOptimizerActionTaskCard } from "@/client/features/page-optimizer/PageOptimizerActionTaskCard";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  listPageOptimizerAuditTasks,
  listPageOptimizerTaskStates,
  updatePageOptimizerTaskStatus,
} from "@/serverFunctions/page-optimizer";
import { buildPageOptimizerActionPlan } from "@/shared/page-optimizer-action-plan";
import type {
  PageOptimizerBenchmark,
  PageOptimizerInternalLinksResult,
  PageOptimizerSuccess,
  PageOptimizerTaskState,
  PageOptimizerTaskStatus,
} from "@/shared/page-optimizer";

export function PageOptimizerActionPlan({
  projectId,
  result,
  benchmark,
  internalLinks,
  previousResult,
  onRecheck,
  isRechecking,
}: {
  projectId: string;
  result: PageOptimizerSuccess;
  benchmark: PageOptimizerBenchmark | null;
  internalLinks: PageOptimizerInternalLinksResult | null;
  previousResult: PageOptimizerSuccess | null;
  onRecheck: () => void;
  isRechecking: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = [
    "page-optimizer-task-states",
    projectId,
    result.url,
    result.targetKeyword,
  ] as const;
  const request = {
    projectId,
    url: result.url,
    targetKeyword: result.targetKeyword,
  };
  const statesQuery = useQuery({
    queryKey,
    queryFn: () => listPageOptimizerTaskStates({ data: request }),
    staleTime: 30_000,
    retry: false,
  });
  const auditQuery = useQuery({
    queryKey: ["page-optimizer-audit-tasks", projectId, result.url],
    queryFn: () => listPageOptimizerAuditTasks({ data: request }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const statusMutation = useMutation({
    mutationFn: (update: { taskId: string; status: PageOptimizerTaskStatus }) =>
      updatePageOptimizerTaskStatus({
        data: { ...request, ...update },
      }),
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<PageOptimizerTaskState[]>(queryKey);
      const current = previous ?? [];
      queryClient.setQueryData<PageOptimizerTaskState[]>(queryKey, [
        ...current.filter((state) => state.taskId !== update.taskId),
        {
          taskId: update.taskId,
          status: update.status,
          updatedAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (_error, _update, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<PageOptimizerTaskState[]>(
        queryKey,
        (current) => [
          ...(current ?? []).filter((state) => state.taskId !== saved.taskId),
          saved,
        ],
      );
    },
  });

  const tasks = buildPageOptimizerActionPlan({
    page: result,
    auditTasks: auditQuery.data,
    benchmark,
    internalLinks,
  });
  const states = new Map(
    (statesQuery.data ?? []).map((state) => [state.taskId, state.status]),
  );
  const statusFor = (taskId: string) => states.get(taskId) ?? "todo";
  const done = tasks.filter((task) => statusFor(task.id) === "done").length;
  const inProgress = tasks.filter(
    (task) => statusFor(task.id) === "in_progress",
  ).length;
  const remaining = tasks.length - done;
  const highPriority = tasks.filter(
    (task) => task.priority === "high" && statusFor(task.id) !== "done",
  ).length;
  const nextTaskIds = new Set(
    tasks
      .filter((task) => statusFor(task.id) !== "done")
      .slice(0, 3)
      .map((task) => task.id),
  );

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              <h2>SEO action plan</h2>
            </CardTitle>
            <CardDescription className="mt-1">
              Work from top to bottom. Your progress is saved for this page and
              keyword.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRecheck}
            pending={isRechecking}
          >
            <RefreshCw data-icon="inline-start" />
            Recheck page
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PlanMetric label="Remaining" value={remaining} />
          <PlanMetric label="In progress" value={inProgress} />
          <PlanMetric label="Done" value={done} className="text-success" />
          <PlanMetric
            label="High priority left"
            value={highPriority}
            className={highPriority > 0 ? "text-warning" : "text-success"}
          />
        </div>

        <SourceCoverage
          auditCount={auditQuery.data?.length}
          benchmarkReady={benchmark !== null}
          internalLinksReady={internalLinks !== null}
        />

        {statesQuery.isError ? (
          <QueryError
            error={statesQuery.error}
            fallback="We couldn't load saved task progress."
            onRetry={() => void statesQuery.refetch()}
            isRetrying={statesQuery.isFetching}
            variant="inline"
          />
        ) : null}
        {auditQuery.isError ? (
          <QueryError
            error={auditQuery.error}
            fallback="We couldn't add tasks from the latest Site Audit."
            onRetry={() => void auditQuery.refetch()}
            isRetrying={auditQuery.isFetching}
            variant="inline"
          />
        ) : null}
        {statusMutation.isError ? (
          <QueryError
            error={statusMutation.error}
            fallback="We couldn't save that task status."
            variant="inline"
          />
        ) : null}

        {tasks.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={CheckCircle2}
            title="No active SEO tasks"
            description="The current on-page checks pass and the connected analyses did not add another action."
          />
        ) : (
          <section>
            <div className="mb-3">
              <h3 className="font-semibold">Prioritized tasks</h3>
              <p className="text-sm text-muted-foreground">
                The numbered tasks are your next three actions. Change the
                status as you work, then recheck the page.
              </p>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <PageOptimizerActionTaskCard
                  key={task.id}
                  task={task}
                  status={statusFor(task.id)}
                  nextNumber={
                    nextTaskIds.has(task.id)
                      ? [...nextTaskIds].indexOf(task.id) + 1
                      : null
                  }
                  rechecked={previousResult !== null}
                  saving={
                    statusMutation.isPending &&
                    statusMutation.variables.taskId === task.id
                  }
                  onStatusChange={(status) =>
                    statusMutation.mutate({ taskId: task.id, status })
                  }
                />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function PlanMetric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}

function SourceCoverage({
  auditCount,
  benchmarkReady,
  internalLinksReady,
}: {
  auditCount: number | undefined;
  benchmarkReady: boolean;
  internalLinksReady: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <Badge variant="success">On-page included</Badge>
      <Badge variant={auditCount === undefined ? "outline" : "success"}>
        {auditCount === undefined
          ? "Checking Site Audit…"
          : `Site Audit: ${auditCount} issue${auditCount === 1 ? "" : "s"}`}
      </Badge>
      <Badge variant={benchmarkReady ? "success" : "outline"}>
        {benchmarkReady ? "Competitors included" : "Run benchmark below"}
      </Badge>
      <Badge variant={internalLinksReady ? "success" : "outline"}>
        {internalLinksReady
          ? "Internal links included"
          : "Run internal links below"}
      </Badge>
    </div>
  );
}
