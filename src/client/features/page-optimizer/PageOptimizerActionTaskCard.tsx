import { CheckCircle2, CircleDot, TriangleAlert } from "lucide-react";
import { CopyButton } from "@/client/components/CopyButton";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { Badge } from "@/client/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type {
  PageOptimizerActionTask,
  PageOptimizerTaskSource,
  PageOptimizerTaskStatus,
} from "@/shared/page-optimizer";

const STATUS_OPTIONS: Array<{
  value: PageOptimizerTaskStatus;
  label: string;
}> = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const SOURCE_LABELS: Record<PageOptimizerTaskSource, string> = {
  on_page: "On-page",
  site_audit: "Site Audit",
  competitors: "Competitors",
  internal_links: "Internal links",
};

function isTaskStatus(value: string | null): value is PageOptimizerTaskStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

export function PageOptimizerActionTaskCard({
  task,
  status,
  nextNumber,
  rechecked,
  saving,
  onStatusChange,
}: {
  task: PageOptimizerActionTask;
  status: PageOptimizerTaskStatus;
  nextNumber: number | null;
  rechecked: boolean;
  saving: boolean;
  onStatusChange: (status: PageOptimizerTaskStatus) => void;
}) {
  const done = status === "done";
  return (
    <article
      className={`rounded-lg border p-4 ${done ? "border-success/30 bg-success/5" : "border-border"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {nextNumber ? (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {nextNumber}
            </span>
          ) : done ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <CircleDot className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{task.title}</h4>
              <Badge variant={task.priority === "high" ? "warning" : "outline"}>
                {task.priority} priority
              </Badge>
              <Badge variant="outline">{SOURCE_LABELS[task.source]}</Badge>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-medium">Do this: </span>
              <span className="text-foreground/80">{task.action}</span>
            </p>
          </div>
        </div>
        <Select
          items={STATUS_OPTIONS}
          value={status}
          disabled={saving}
          onValueChange={(value) => {
            if (isTaskStatus(value)) onStatusChange(value);
          }}
        >
          <SelectTrigger size="sm" aria-label={`Status for ${task.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {task.suggestion ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Copy-ready suggestion
            </p>
            <p className="mt-1 text-sm font-medium">{task.suggestion}</p>
          </div>
          <CopyButton
            value={task.suggestion}
            successMessage="Copied task suggestion"
            label="Copy"
          />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
        <p>
          <span className="font-medium">Why it matters: </span>
          <span className="text-foreground/75">{task.why}</span>
        </p>
        <p>
          <span className="font-medium">How to verify: </span>
          <span className="text-foreground/75">{task.verification}</span>
        </p>
      </div>

      {task.destinationUrl ? (
        <SafeExternalLink
          url={task.destinationUrl}
          label="Open destination page"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        />
      ) : null}

      {done && rechecked && task.source === "on_page" ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-2.5 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            The latest recheck still finds this issue. Review the published
            change before considering it verified.
          </span>
        </div>
      ) : null}
    </article>
  );
}
