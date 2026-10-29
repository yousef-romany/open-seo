import { ArrowUpRight, Layers3 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type { PageOptimizerHistoryEntry } from "@/shared/page-optimizer";

export function PageOptimizerRecentTargets({
  entries,
  activeUrl,
  activeKeyword,
  onOpen,
}: {
  entries: PageOptimizerHistoryEntry[];
  activeUrl: string;
  activeKeyword: string;
  onOpen: (url: string, keyword: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers3 className="size-4 text-primary" />
          <h2>Recently optimized pages</h2>
        </CardTitle>
        <CardDescription>
          Open any saved page and keyword to continue from its latest check.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border rounded-lg border border-border">
          {entries.map((entry) => {
            const current = isCurrent(
              entry,
              activeUrl.trim(),
              activeKeyword.trim(),
            );
            return (
              <div
                key={`${entry.url}\n${entry.targetKeyword}`}
                className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {entry.targetKeyword}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.url}
                  </p>
                </div>
                <div className="text-sm md:text-right">
                  <p>
                    <span className="font-medium text-success">
                      {entry.passedCount} passed
                    </span>
                    <span className="text-muted-foreground">
                      {` · ${entry.improveCount} changes`}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last checked {formatDate(entry.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={current}
                  onClick={() => onOpen(entry.url, entry.targetKeyword)}
                >
                  {current ? "Open now" : "Open"}
                  {current ? null : <ArrowUpRight data-icon="inline-end" />}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function isCurrent(
  entry: PageOptimizerHistoryEntry,
  activeUrl: string,
  activeKeyword: string,
): boolean {
  if (!activeUrl || !activeKeyword) return false;
  let normalizedUrl = activeUrl;
  try {
    normalizedUrl = new URL(activeUrl).href;
  } catch {
    return false;
  }
  return (
    entry.url === normalizedUrl &&
    entry.targetKeyword.localeCompare(activeKeyword, undefined, {
      sensitivity: "accent",
    }) === 0
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
