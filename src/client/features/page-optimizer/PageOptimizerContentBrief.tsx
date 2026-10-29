import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { CopyButton } from "@/client/components/CopyButton";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { downloadFile } from "@/client/lib/download";
import {
  buildPageOptimizerContentBrief,
  formatPageOptimizerContentBriefMarkdown,
} from "@/shared/page-optimizer-content-brief";
import type {
  PageOptimizerBenchmark,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

export function PageOptimizerContentBrief({
  benchmark,
  result,
}: {
  benchmark: PageOptimizerBenchmark;
  result: PageOptimizerSuccess;
}) {
  const brief = useMemo(
    () => buildPageOptimizerContentBrief(result, benchmark),
    [benchmark, result],
  );
  const markdown = useMemo(
    () => formatPageOptimizerContentBriefMarkdown(brief),
    [brief],
  );
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const completedCount = completed.size;

  const setItemCompleted = (id: string, checked: boolean) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/[0.035]">
      <div className="flex flex-col gap-3 border-b border-primary/15 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 size-4 text-primary" />
          <div>
            <h3 className="font-semibold">Content brief</h3>
            <p className="text-sm text-muted-foreground">
              A working plan built from this page and its competitor benchmark.
              Creating and exporting it uses no extra credits.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <CopyButton
            value={markdown}
            successMessage="Content brief copied"
            label="Copy brief"
          />
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() =>
              downloadFile(
                markdown,
                `${filenameSlug(brief.targetKeyword)}-content-brief.md`,
                "text/markdown",
              )
            }
          >
            <Download data-icon="inline-start" />
            Download .md
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <BriefField label="Target keyword" value={brief.targetKeyword} />
          <BriefField label="Content goal" value={brief.contentGoal} />
          <BriefField
            label="Recommended title"
            value={brief.recommendedTitle}
          />
          <BriefField label="Recommended H1" value={brief.recommendedH1} />
        </div>

        <div className="rounded-lg border border-border bg-background/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Content-depth guidance
          </p>
          <p className="mt-1 text-sm">{brief.wordCountGuidance}</p>
        </div>

        <div>
          <h4 className="font-semibold">Suggested outline</h4>
          <p className="text-sm text-muted-foreground">
            Treat these as working headings. Rewrite them to match the offer and
            brand voice before publishing.
          </p>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-background/70">
            {brief.sections.map((section, index) => (
              <div
                key={`${index}-${section.heading}`}
                className="grid gap-2 px-3 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
              >
                <span className="text-sm font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{section.heading}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {section.purpose}
                  </p>
                </div>
                <Badge
                  variant={
                    section.source === "competitor gap" ? "info" : "outline"
                  }
                >
                  {section.source}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="font-semibold">Questions the page should answer</h4>
            <ul className="mt-3 space-y-2">
              {brief.questions.map((question) => (
                <li
                  key={question}
                  className="flex gap-2 text-sm text-foreground/85"
                >
                  <span className="text-primary">•</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold">Implementation checklist</h4>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{brief.checklist.length} complete
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {brief.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={completed.has(item.id)}
                    onCheckedChange={(checked) =>
                      setItemCompleted(item.id, checked)
                    }
                  />
                  <span
                    className={
                      completed.has(item.id)
                        ? "text-muted-foreground line-through"
                        : "text-foreground/85"
                    }
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BriefField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function filenameSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "page";
}
