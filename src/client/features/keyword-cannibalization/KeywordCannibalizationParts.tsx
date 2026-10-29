import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleHelp } from "lucide-react";
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
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  formatCount,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { safeHttpUrl } from "@/shared/safe-url";
import type {
  CannibalizationDecision,
  CannibalizationPage,
  CannibalizationPriority,
  KeywordCannibalizationConflict,
} from "@/server/features/gsc/keywordCannibalizationReport";

const decisionCopy: Record<
  CannibalizationDecision,
  { label: string; variant: "info" | "warning" | "destructive" | "secondary" }
> = {
  merge: { label: "Merge", variant: "info" },
  redirect: { label: "Redirect after review", variant: "destructive" },
  reposition: { label: "Reposition", variant: "warning" },
  keep: { label: "Keep separate", variant: "secondary" },
};

const priorityCopy: Record<
  CannibalizationPriority,
  { label: string; variant: "destructive" | "warning" | "secondary" }
> = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "secondary" },
};

function pageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}

function DecisionBadge({ decision }: { decision: CannibalizationDecision }) {
  const copy = decisionCopy[decision];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}

function PriorityBadge({ priority }: { priority: CannibalizationPriority }) {
  const copy = priorityCopy[priority];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}

function PageLink({ page }: { page: CannibalizationPage }) {
  return (
    <a
      href={safeHttpUrl(page.url) ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block truncate text-primary underline-offset-4 hover:underline"
      title={page.url}
    >
      {pageLabel(page.url)}
    </a>
  );
}

function OptimizerButton({
  projectId,
  query,
  page,
  label,
  variant = "default",
}: {
  projectId: string;
  query: string;
  page: CannibalizationPage;
  label: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      nativeButton={false}
      render={
        <Link
          to="/p/$projectId/page-optimizer"
          params={{ projectId }}
          search={{ url: page.url, keyword: query }}
        />
      }
    >
      {label}
      <ArrowRight data-icon="inline-end" />
    </Button>
  );
}

export function SummaryCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </div>
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}

export function StartHereConflict({
  projectId,
  conflict,
  rank,
}: {
  projectId: string;
  conflict: KeywordCannibalizationConflict;
  rank: number;
}) {
  const competitor = conflict.competingPages[0];
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            #{rank} to review
          </span>
          <PriorityBadge priority={conflict.priority} />
        </div>
        <CardTitle className="truncate" title={conflict.query}>
          {conflict.query}
        </CardTitle>
        <CardDescription>
          {formatCount(conflict.totalImpressions)} impressions across{" "}
          {conflict.competingPages.length + 1} pages
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Primary page
            </p>
            <PageLink page={conflict.primaryPage} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Strongest competitor
            </p>
            <PageLink page={competitor} />
          </div>
        </div>
        <div>
          <DecisionBadge decision={conflict.decision} />
          <p className="mt-2 text-sm">{conflict.explanation}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            What to do
          </p>
          <p className="mt-1 text-sm leading-relaxed">{conflict.action}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <OptimizerButton
            projectId={projectId}
            query={conflict.query}
            page={conflict.primaryPage}
            label="Primary page"
          />
          <OptimizerButton
            projectId={projectId}
            query={conflict.query}
            page={competitor}
            label="Competing page"
            variant="outline"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DecisionGuide() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleHelp className="size-4 text-muted-foreground" />
          What each decision means
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-medium">Merge</dt>
            <dd className="mt-1 text-muted-foreground">
              Move the useful parts into the stronger page.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Reposition</dt>
            <dd className="mt-1 text-muted-foreground">
              Give each page a different target keyword and intent.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Redirect after review</dt>
            <dd className="mt-1 text-muted-foreground">
              Combine truly duplicate pages, then 301 the weaker URL.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Keep separate</dt>
            <dd className="mt-1 text-muted-foreground">
              Preserve both pages and make their purposes clearer.
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function ConflictTable({
  projectId,
  conflicts,
}: {
  projectId: string;
  conflicts: KeywordCannibalizationConflict[];
}) {
  return (
    <TableCard>
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">All queries with multiple pages</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sorted by priority and total search visibility.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Query</TableHead>
            <TableHead>Primary page</TableHead>
            <TableHead>Strongest competitor</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conflicts.map((conflict) => {
            const competitor = conflict.competingPages[0];
            return (
              <TableRow key={conflict.query}>
                <TableCell className="min-w-48 max-w-xs">
                  <span
                    className="block truncate font-medium"
                    title={conflict.query}
                  >
                    {conflict.query}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCount(conflict.totalImpressions)} impressions
                  </span>
                </TableCell>
                <TableCell className="min-w-48 max-w-xs">
                  <PageLink page={conflict.primaryPage} />
                  <span className="text-xs text-muted-foreground">
                    Position {formatPosition(conflict.primaryPage.position)} ·{" "}
                    {formatCount(conflict.primaryPage.clicks)} clicks
                  </span>
                </TableCell>
                <TableCell className="min-w-48 max-w-xs">
                  <PageLink page={competitor} />
                  <span className="text-xs text-muted-foreground">
                    Position {formatPosition(competitor.position)} ·{" "}
                    {formatCount(competitor.clicks)} clicks
                    {conflict.competingPages.length > 1
                      ? ` · +${conflict.competingPages.length - 1} more`
                      : ""}
                  </span>
                </TableCell>
                <TableCell>
                  <DecisionBadge decision={conflict.decision} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={conflict.priority} />
                </TableCell>
                <TableCell className="text-right">
                  <OptimizerButton
                    projectId={projectId}
                    query={conflict.query}
                    page={conflict.primaryPage}
                    label="Optimize"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableCard>
  );
}
