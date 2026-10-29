import { Link } from "@tanstack/react-router";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Skeleton } from "@/client/components/ui/skeleton";
import type {
  SeoActionCenterReport,
  SeoActionItem,
  SeoActionSource,
  SeoActionStatus,
} from "@/shared/action-center";

const STATUS_OPTIONS: Array<{ value: SeoActionStatus; label: string }> = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const SOURCE_LABELS: Record<SeoActionSource, string> = {
  content_refresh: "Content Refresh",
  cannibalization: "Cannibalization",
  site_audit: "Site Audit",
};

function isStatus(value: string | null): value is SeoActionStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

export function LoadingState() {
  return (
    <div className="space-y-4" role="status" aria-label="Building SEO plan">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-80 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "info" | "warning" | "success";
}) {
  const toneClass = {
    default: "text-primary bg-primary/10",
    info: "text-info bg-info/10",
    warning: "text-warning bg-warning/10",
    success: "text-success bg-success/10",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <span className={`rounded-lg p-2 ${toneClass}`}>{icon}</span>
      </CardContent>
    </Card>
  );
}

export function SourceNotices({
  projectId,
  report,
}: {
  projectId: string;
  report: SeoActionCenterReport;
}) {
  if (report.sources.gscConnected && report.sources.auditAvailable) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {!report.sources.gscConnected ? (
        <GoogleConnectionCard provider="gsc" projectId={projectId} />
      ) : null}
      {!report.sources.auditAvailable ? (
        <Card>
          <CardContent className="flex h-full flex-col items-start justify-center gap-3 p-4">
            <div>
              <h2 className="font-semibold">Add technical SEO signals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Run a Site Audit so the plan can include broken links,
                indexability, titles, headings, and crawl problems.
              </p>
            </div>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link
                  to="/p/$projectId/audit"
                  params={{ projectId }}
                  search={{}}
                />
              }
            >
              Open Site Audit
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export type StatusMutation = {
  isPending: boolean;
  variables?: { actionKey: string; status: SeoActionStatus };
  mutate: (input: { actionKey: string; status: SeoActionStatus }) => void;
};

export function StartHere({
  projectId,
  actions,
  mutation,
}: {
  projectId: string;
  actions: SeoActionItem[];
  mutation: StatusMutation;
}) {
  return (
    <section className="space-y-3" aria-labelledby="start-here-title">
      <div>
        <h2 id="start-here-title" className="text-lg font-semibold">
          Start here
        </h2>
        <p className="text-sm text-muted-foreground">
          These are the three best next actions based on likely impact and the
          evidence currently available.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action, index) => (
          <ActionCard
            key={action.key}
            projectId={projectId}
            action={action}
            rank={index + 1}
            mutation={mutation}
          />
        ))}
      </div>
    </section>
  );
}

function ActionCard({
  projectId,
  action,
  rank,
  mutation,
}: {
  projectId: string;
  action: SeoActionItem;
  rank: number;
  mutation: StatusMutation;
}) {
  return (
    <Card className="border-primary/20">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={action.impact === "high" ? "warning" : "outline"}>
                {action.impact} impact
              </Badge>
              <Badge variant="outline">{action.difficulty} effort</Badge>
              <Badge variant="info">{SOURCE_LABELS[action.source]}</Badge>
            </div>
            <h3 className="mt-2 font-semibold leading-snug">{action.title}</h3>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Why this is here</p>
            <p className="mt-0.5 text-muted-foreground">{action.evidence}</p>
          </div>
          <div>
            <p className="font-medium">Do this</p>
            <p className="mt-0.5 text-muted-foreground">{action.why}</p>
          </div>
          <ol className="space-y-2">
            {action.steps.map((step, index) => (
              <li key={step} className="flex gap-2 text-foreground/80">
                <span className="font-semibold text-primary">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <ActionStatusSelect action={action} mutation={mutation} />
          <OpenActionButton projectId={projectId} action={action} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyPlan({
  projectId,
  actions,
  mutation,
}: {
  projectId: string;
  actions: SeoActionItem[];
  mutation: StatusMutation;
}) {
  return (
    <section className="space-y-3" aria-labelledby="weekly-plan-title">
      <div>
        <h2 id="weekly-plan-title" className="text-lg font-semibold">
          This week's queue
        </h2>
        <p className="text-sm text-muted-foreground">
          Finish the first three before moving down the list. The plan saves
          your status automatically.
        </p>
      </div>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {actions.map((action, index) => (
            <div
              key={action.key}
              className="grid gap-3 p-4 lg:grid-cols-[2rem_minmax(0,1fr)_auto_auto] lg:items-center"
            >
              <span className="text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{action.title}</h3>
                  <Badge variant="outline">{action.impact} impact</Badge>
                  <Badge variant="outline">{action.difficulty} effort</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {action.evidence}
                </p>
              </div>
              <ActionStatusSelect action={action} mutation={mutation} />
              <OpenActionButton projectId={projectId} action={action} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export function ActionStatusSelect({
  action,
  mutation,
}: {
  action: SeoActionItem;
  mutation: StatusMutation;
}) {
  const saving =
    mutation.isPending && mutation.variables?.actionKey === action.key;
  return (
    <Select
      items={STATUS_OPTIONS}
      value={action.status}
      disabled={saving}
      onValueChange={(value) => {
        if (isStatus(value)) {
          mutation.mutate({ actionKey: action.key, status: value });
        }
      }}
    >
      <SelectTrigger size="sm" aria-label={`Status for ${action.title}`}>
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
  );
}

function OpenActionButton({
  projectId,
  action,
}: {
  projectId: string;
  action: SeoActionItem;
}) {
  if (action.tool === "page_optimizer" && action.url && action.keyword) {
    return (
      <Button
        nativeButton={false}
        size="sm"
        render={
          <Link
            to="/p/$projectId/page-optimizer"
            params={{ projectId }}
            search={{ url: action.url, keyword: action.keyword }}
          />
        }
      >
        Open Page Optimizer
      </Button>
    );
  }
  if (action.tool === "content_refresh") {
    return (
      <Button
        nativeButton={false}
        size="sm"
        variant="outline"
        render={
          <Link
            to="/p/$projectId/content-refresh"
            params={{ projectId }}
            search={{}}
          />
        }
      >
        Open {SOURCE_LABELS[action.source]}
      </Button>
    );
  }
  if (action.tool === "cannibalization") {
    return (
      <Button
        nativeButton={false}
        size="sm"
        variant="outline"
        render={
          <Link
            to="/p/$projectId/keyword-cannibalization"
            params={{ projectId }}
            search={{}}
          />
        }
      >
        Open {SOURCE_LABELS[action.source]}
      </Button>
    );
  }
  return (
    <Button
      nativeButton={false}
      size="sm"
      variant="outline"
      render={
        <Link to="/p/$projectId/audit" params={{ projectId }} search={{}} />
      }
    >
      Open {SOURCE_LABELS[action.source]}
    </Button>
  );
}
