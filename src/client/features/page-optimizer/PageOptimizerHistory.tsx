import { Clock3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type { PageOptimizerHistoryEntry } from "@/shared/page-optimizer";

export function PageOptimizerHistory({
  entries,
  loading,
  failed,
}: {
  entries: PageOptimizerHistoryEntry[];
  loading: boolean;
  failed: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          <h2>Optimization history</h2>
        </CardTitle>
        <CardDescription>
          The 10 most recent checks for this exact page and target keyword.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : failed ? (
          <p className="text-sm text-destructive">
            History could not be loaded. Your current result is still available.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The first successful check will appear here.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="grid gap-2 px-3 py-3 md:grid-cols-[minmax(180px,1fr)_auto_auto] md:items-center md:gap-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(entry.createdAt)}
                    {index === 0 ? (
                      <span className="ml-2 text-xs font-normal text-primary">
                        Latest
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.title || "Untitled page"}
                  </p>
                </div>
                <p className="text-sm">
                  <span className="font-medium text-success">
                    {entry.passedCount} passed
                  </span>
                  <span className="text-muted-foreground">
                    {` · ${entry.improveCount} changes · ${entry.reviewCount} review`}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground md:text-right">
                  {entry.wordCount.toLocaleString()} words · keyword used{" "}
                  {entry.keywordOccurrences}×
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}
