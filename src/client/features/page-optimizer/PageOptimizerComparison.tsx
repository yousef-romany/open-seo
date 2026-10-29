import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";
import { comparePageOptimizerRuns } from "@/shared/page-optimizer-comparison";

export function PageOptimizerComparison({
  before,
  after,
}: {
  before: PageOptimizerSuccess;
  after: PageOptimizerSuccess;
}) {
  const comparison = comparePageOptimizerRuns(before, after);
  const metrics = [
    { label: "Passed checks", ...comparison.metrics.passed },
    { label: "Need changes", ...comparison.metrics.needChanges },
    { label: "Visible words", ...comparison.metrics.visibleWords },
    { label: "Exact keyword uses", ...comparison.metrics.keywordUses },
  ];

  return (
    <Card className="border-primary/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-4 text-primary" />
          <h2>Changes since the last check</h2>
        </CardTitle>
        <CardDescription>
          This compares the page you just rechecked with the result that was on
          screen before it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!comparison.hasChanges ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">No page changes detected yet.</p>
            <p className="mt-1 text-muted-foreground">
              If you just published an update, wait for the website or CDN to
              refresh, then recheck the page.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </p>
              <div className="mt-1 flex items-center gap-2 font-semibold">
                <span>{metric.before.toLocaleString()}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span>{metric.after.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {comparison.improvedChecks.length > 0 ? (
          <ChangeList
            icon={CheckCircle2}
            title="Improved"
            items={comparison.improvedChecks}
            className="border-success/25 bg-success/5 text-success"
          />
        ) : null}

        {comparison.regressedChecks.length > 0 ? (
          <ChangeList
            icon={TriangleAlert}
            title="Needs attention"
            items={comparison.regressedChecks}
            className="border-warning/25 bg-warning/5 text-warning"
          />
        ) : null}

        {comparison.changedElements.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Text updated: </span>
            {comparison.changedElements.join(", ")}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChangeList({
  icon: Icon,
  title,
  items,
  className,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  className: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <p className="text-sm">
          <span className="font-medium">{title}: </span>
          <span className="text-foreground/80">{items.join(", ")}</span>
        </p>
      </div>
    </div>
  );
}
