import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CodeXml,
  Image,
  Link2,
  WholeWord,
} from "lucide-react";
import { sort } from "remeda";
import { MetricsTable } from "@/client/components/MetricsTable";
import { PageOptimizerComparison } from "@/client/features/page-optimizer/PageOptimizerComparison";
import { PageOptimizerBenchmark } from "@/client/features/page-optimizer/PageOptimizerBenchmark";
import { PageOptimizerInternalLinks } from "@/client/features/page-optimizer/PageOptimizerInternalLinks";
import { PageOptimizerActionPlan } from "@/client/features/page-optimizer/PageOptimizerActionPlan";
import { PageOptimizerSummaryStrip } from "@/client/features/page-optimizer/PageOptimizerSummaryStrip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type {
  PageOptimizerBenchmark as BenchmarkResult,
  PageOptimizerFailure,
  PageOptimizerInternalLinksResult,
  PageOptimizerResult,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function PageOptimizerResults({
  projectId,
  result,
  previousResult,
  onRecheck,
  isRechecking,
}: {
  projectId: string;
  result: PageOptimizerResult;
  previousResult: PageOptimizerSuccess | null;
  onRecheck: () => void;
  isRechecking: boolean;
}) {
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [internalLinks, setInternalLinks] =
    useState<PageOptimizerInternalLinksResult | null>(null);
  if (!result.ok) return <OptimizerFailure result={result} />;

  const improvements = sort(
    result.checks.filter((check) => check.status !== "pass"),
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  const passed = result.checks.filter((check) => check.status === "pass");
  const reviews = result.checks.filter(
    (check) => check.status === "review",
  ).length;

  return (
    <div className="space-y-4">
      {result.coverageWarning === "javascript" ? (
        <Alert variant="warning">
          <CodeXml />
          <AlertTitle>
            This page may load its content with JavaScript.
          </AlertTitle>
          <AlertDescription>
            Title and search-description checks are available, but content and
            heading checks are incomplete. Server-render the important content,
            then run the optimizer again.
          </AlertDescription>
        </Alert>
      ) : null}

      <PageOptimizerSummaryStrip
        passed={passed.length}
        improvements={improvements.length}
        reviews={reviews}
        result={result}
      />

      {previousResult ? (
        <PageOptimizerComparison before={previousResult} after={result} />
      ) : null}

      <PageOptimizerActionPlan
        projectId={projectId}
        result={result}
        benchmark={benchmark}
        internalLinks={internalLinks}
        previousResult={previousResult}
        onRecheck={onRecheck}
        isRechecking={isRechecking}
      />

      <PageOptimizerBenchmark
        projectId={projectId}
        result={result}
        onBenchmarkChange={setBenchmark}
      />

      <PageOptimizerInternalLinks
        projectId={projectId}
        result={result}
        onInternalLinksChange={setInternalLinks}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
        <div className="space-y-4">
          {passed.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>Checks that passed</h2>
                </CardTitle>
                <CardDescription>
                  Keep these elements intact while editing the page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {passed.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <div className="min-w-0">
                        <p className="font-medium">{check.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {check.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <SearchPreview result={result} />
          <PageSignals result={result} />
        </aside>
      </div>
    </div>
  );
}

function SearchPreview({ result }: { result: PageOptimizerSuccess }) {
  const title = result.page.title || result.targetKeyword;
  const description =
    result.page.metaDescription ||
    "No meta description found. Google may build a search snippet from the page content.";
  let displayUrl = result.url;
  try {
    const parsed = new URL(result.url);
    displayUrl = `${parsed.hostname}${parsed.pathname}`;
  } catch {
    // The service already returns a validated URL; keep the original if a
    // future transport changes its format.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Search preview</h2>
        </CardTitle>
        <CardDescription>
          An approximation; Google can rewrite titles and descriptions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="truncate text-xs text-muted-foreground">{displayUrl}</p>
          <p className="mt-1 line-clamp-2 text-lg font-medium text-primary">
            {title}
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PageSignals({ result }: { result: PageOptimizerSuccess }) {
  const rows = [
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <WholeWord className="size-3.5" /> Exact keyword uses
        </span>
      ),
      value: result.page.keywordOccurrences,
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Image className="size-3.5" /> Images missing alt
        </span>
      ),
      value: `${result.page.imagesMissingAlt}/${result.page.imagesTotal}`,
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Link2 className="size-3.5" /> Internal links
        </span>
      ),
      value: result.page.internalLinks,
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <CodeXml className="size-3.5" /> Structured data
        </span>
      ),
      value: result.page.hasStructuredData ? "Found" : "Not found",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Page signals</h2>
        </CardTitle>
        <CardDescription>
          What OpenSEO found in the page's public HTML.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <MetricsTable rows={rows} />
      </CardContent>
    </Card>
  );
}

function OptimizerFailure({ result }: { result: PageOptimizerFailure }) {
  const messages: Record<
    PageOptimizerFailure["reason"],
    { title: string; description: string }
  > = {
    invalid_url: {
      title: "This URL isn't valid",
      description:
        "Enter a full public page URL, such as https://example.com/page.",
    },
    blocked_target: {
      title: "This address can't be fetched",
      description:
        "Private, local, and internal network addresses are blocked for security.",
    },
    blocked_by_site: {
      title: "The website blocked OpenSEO",
      description:
        "Allow the OpenSEO crawler in the site's bot-protection settings, then try again.",
    },
    unreachable: {
      title: "The page couldn't be reached",
      description: "Check that the page is public and online, then try again.",
    },
    http_error: {
      title: `The page returned ${result.statusCode ?? "an error"}`,
      description: "Use a live page that returns a successful response.",
    },
    not_html: {
      title: "This isn't an HTML page",
      description:
        "Page Optimizer can analyze web pages, but not PDFs, images, or other files.",
    },
    too_many_redirects: {
      title: "The page redirects too many times",
      description:
        "Use the final live URL or fix the redirect chain, then try again.",
    },
  };
  const message = messages[result.reason];

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription>{message.description}</AlertDescription>
    </Alert>
  );
}
