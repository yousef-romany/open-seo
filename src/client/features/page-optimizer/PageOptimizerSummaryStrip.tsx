import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

export function PageOptimizerSummaryStrip({
  passed,
  improvements,
  reviews,
  result,
}: {
  passed: number;
  improvements: number;
  reviews: number;
  result: PageOptimizerSuccess;
}) {
  const items = [
    { label: "Passed", value: passed, className: "text-success" },
    {
      label: "Need changes",
      value: improvements - reviews,
      className: improvements > reviews ? "text-warning" : "",
    },
    {
      label: "Need review",
      value: reviews,
      className: reviews > 0 ? "text-info" : "",
    },
    {
      label: "Visible words",
      value: result.page.wordCount.toLocaleString(),
      className: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
          <p className={`mt-1 text-2xl font-semibold ${item.className}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
