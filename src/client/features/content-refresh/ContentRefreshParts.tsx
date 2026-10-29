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
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { safeHttpUrl } from "@/shared/safe-url";
import type {
  ContentRefreshOpportunity,
  ContentRefreshPriority,
} from "@/server/features/gsc/contentRefreshReport";

function pageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}

const priorityCopy: Record<
  ContentRefreshPriority,
  { label: string; variant: "destructive" | "warning" | "secondary" }
> = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "secondary" },
};

function PriorityBadge({ priority }: { priority: ContentRefreshPriority }) {
  const copy = priorityCopy[priority];
  return <Badge variant={copy.variant}>{copy.label}</Badge>;
}

function OptimizerButton({
  projectId,
  opportunity,
  size = "sm",
}: {
  projectId: string;
  opportunity: ContentRefreshOpportunity;
  size?: "sm" | "default";
}) {
  if (!opportunity.keyword) {
    return (
      <Button
        size={size}
        variant="outline"
        nativeButton={false}
        render={
          <Link
            to="/p/$projectId/search-performance"
            params={{ projectId }}
            search={{ tab: "queries", pageText: opportunity.url }}
          />
        }
      >
        Find its query
      </Button>
    );
  }

  return (
    <Button
      size={size}
      nativeButton={false}
      render={
        <Link
          to="/p/$projectId/page-optimizer"
          params={{ projectId }}
          search={{ url: opportunity.url, keyword: opportunity.keyword }}
        />
      }
    >
      Optimize page
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

export function StartHereCard({
  projectId,
  opportunity,
  rank,
}: {
  projectId: string;
  opportunity: ContentRefreshOpportunity;
  rank: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            #{rank} to fix
          </span>
          <PriorityBadge priority={opportunity.priority} />
        </div>
        <CardTitle>
          <a
            href={safeHttpUrl(opportunity.url) ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-primary underline-offset-4 hover:underline"
            title={opportunity.url}
          >
            {pageLabel(opportunity.url)}
          </a>
        </CardTitle>
        <CardDescription className="truncate" title={opportunity.keyword ?? ""}>
          {opportunity.keyword
            ? `Main query: ${opportunity.keyword}`
            : "Open GSC to choose this page's main query"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">What changed</p>
          <p className="mt-1 text-sm">{opportunity.reason}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            What to do
          </p>
          <p className="mt-1 text-sm leading-relaxed">{opportunity.action}</p>
        </div>
        <div className="mt-auto pt-1">
          <OptimizerButton
            projectId={projectId}
            opportunity={opportunity}
            size="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricGuide() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleHelp className="size-4 text-muted-foreground" />
          How to read the results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-medium">Clicks</dt>
            <dd className="mt-1 text-muted-foreground">
              Visits from Google. The arrow shows how many were lost.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Impressions</dt>
            <dd className="mt-1 text-muted-foreground">
              Times the page appeared in search, whether clicked or not.
            </dd>
          </div>
          <div>
            <dt className="font-medium">CTR</dt>
            <dd className="mt-1 text-muted-foreground">
              The percentage of impressions that became clicks.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Position</dt>
            <dd className="mt-1 text-muted-foreground">
              Average Google rank. A smaller number is better.
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function OpportunitiesTable({
  projectId,
  opportunities,
}: {
  projectId: string;
  opportunities: ContentRefreshOpportunity[];
}) {
  return (
    <TableCard>
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">All declining pages</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sorted by urgency and estimated traffic loss.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page and query</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Position</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((item) => (
            <TableRow key={item.url}>
              <TableCell className="min-w-64 max-w-md">
                <a
                  href={safeHttpUrl(item.url) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                  title={item.url}
                >
                  {pageLabel(item.url)}
                </a>
                <span
                  className="mt-0.5 block truncate text-xs text-muted-foreground"
                  title={item.keyword ?? undefined}
                >
                  {item.keyword ?? "No current query found"}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span>{formatCount(item.current.clicks)}</span>
                <span className="ml-1 block text-xs text-destructive sm:inline">
                  −{formatCount(item.change.lostClicks)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCount(item.current.impressions)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCtr(item.current.ctr)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.current.impressions > 0
                  ? formatPosition(item.current.position)
                  : "—"}
              </TableCell>
              <TableCell>
                <PriorityBadge priority={item.priority} />
              </TableCell>
              <TableCell className="text-right">
                <OptimizerButton projectId={projectId} opportunity={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}
