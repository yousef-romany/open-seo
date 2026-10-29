import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Link2, Search } from "lucide-react";
import { CopyButton } from "@/client/components/CopyButton";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import { suggestPageInternalLinks } from "@/serverFunctions/page-optimizer";
import type {
  PageOptimizerInternalLinkSuggestion,
  PageOptimizerInternalLinksResult,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

export function PageOptimizerInternalLinks({
  projectId,
  result,
  onInternalLinksChange,
}: {
  projectId: string;
  result: PageOptimizerSuccess;
  onInternalLinksChange?: (result: PageOptimizerInternalLinksResult) => void;
}) {
  const [requested, setRequested] = useState(false);
  const query = useQuery({
    queryKey: [
      "page-optimizer-internal-links",
      projectId,
      result.url,
      result.targetKeyword,
    ],
    queryFn: () =>
      suggestPageInternalLinks({
        data: {
          projectId,
          url: result.url,
          targetKeyword: result.targetKeyword,
        },
      }),
    enabled: false,
    retry: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const findLinks = () => {
    setRequested(true);
    void query.refetch();
  };

  useEffect(() => {
    if (query.data) onInternalLinksChange?.(query.data);
  }, [onInternalLinksChange, query.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-primary" />
          <h2>Internal link suggestions</h2>
        </CardTitle>
        <CardDescription>
          Find relevant links to and from this page, with copy-ready anchor text
          and placement guidance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.data ? (
          <InternalLinksDetails result={query.data} projectId={projectId} />
        ) : query.isError && requested ? (
          <QueryError
            error={query.error}
            fallback="We couldn't check the site's internal links."
            onRetry={findLinks}
            isRetrying={query.isFetching}
            variant="inline"
          />
        ) : (
          <div className="rounded-lg border border-border bg-foreground/[0.02] p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="font-medium">
                  Turn your Site Audit into a linking plan.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  OpenSEO checks the closest related audited pages and removes
                  links that already exist. This reads your pages directly and
                  uses no SEO data credits.
                </p>
              </div>
              <Button
                type="button"
                onClick={findLinks}
                pending={query.isFetching}
              >
                <Search data-icon="inline-start" />
                Find link opportunities
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InternalLinksDetails({
  result,
  projectId,
}: {
  result: PageOptimizerInternalLinksResult;
  projectId: string;
}) {
  if (result.status === "no_audit") {
    return (
      <EmptyState
        variant="plain"
        icon={Link2}
        title="Run a Site Audit first"
        description="OpenSEO needs the audit's page list to find relevant internal link opportunities."
        action={
          <Button
            nativeButton={false}
            render={<Link to="/p/$projectId/audit" params={{ projectId }} />}
          >
            Go to Site Audit
          </Button>
        }
      />
    );
  }

  return <SuggestionList result={result} />;
}

function SuggestionList({
  result,
}: {
  result: Extract<PageOptimizerInternalLinksResult, { status: "ready" }>;
}) {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const incoming = result.suggestions.filter(
    (suggestion) => suggestion.direction === "to_page",
  );
  const outgoing = result.suggestions.filter(
    (suggestion) => suggestion.direction === "from_page",
  );

  const toggleCompleted = (id: string, checked: boolean) => {
    setCompleted((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Audited pages screened" value={result.pagesConsidered} />
        <Metric label="Pages checked live" value={result.pagesAnalyzed} />
        <Metric
          label="Links already pointing here"
          value={result.existingIncomingLinks}
        />
        <Metric
          label="Related pages already linked"
          value={result.existingOutgoingLinks}
        />
      </div>

      {result.suggestions.length === 0 ? (
        <EmptyState
          variant="plain"
          icon={Link2}
          title="No clear missing links found"
          description="The related pages checked already link appropriately, or the audit did not contain a strong topical match."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-primary/5 px-3 py-2">
            <p className="text-sm font-medium">Implementation progress</p>
            <Badge variant="outline">
              {completed.size}/{result.suggestions.length} added
            </Badge>
          </div>
          <SuggestionSection
            title="Pages that should link here"
            description="Edit each source page and add a link to the page you are optimizing."
            suggestions={incoming}
            completed={completed}
            onCompletedChange={toggleCompleted}
          />
          <SuggestionSection
            title="Links to add from this page"
            description="Edit the page you are optimizing and link to these useful related pages."
            suggestions={outgoing}
            completed={completed}
            onCompletedChange={toggleCompleted}
          />
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Based on the latest completed audit of {result.audit.pagesCrawled} pages
        {result.audit.completedAt
          ? ` from ${new Date(result.audit.completedAt).toLocaleDateString()}`
          : ""}
        . OpenSEO checked up to six related pages live before making these
        suggestions.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function SuggestionSection({
  title,
  description,
  suggestions,
  completed,
  onCompletedChange,
}: {
  title: string;
  description: string;
  suggestions: PageOptimizerInternalLinkSuggestion[];
  completed: Set<string>;
  onCompletedChange: (id: string, checked: boolean) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            completed={completed.has(suggestion.id)}
            onCompletedChange={(checked) =>
              onCompletedChange(suggestion.id, checked)
            }
          />
        ))}
      </div>
    </section>
  );
}

function SuggestionCard({
  suggestion,
  completed,
  onCompletedChange,
}: {
  suggestion: PageOptimizerInternalLinkSuggestion;
  completed: boolean;
  onCompletedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${completed ? "border-success/30 bg-success/5" : "border-border"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {suggestion.direction === "to_page"
              ? "Edit this page"
              : "Link to this page"}
          </p>
          <SafeExternalLink
            url={
              suggestion.direction === "to_page"
                ? suggestion.sourceUrl
                : suggestion.destinationUrl
            }
            label={
              suggestion.direction === "to_page"
                ? suggestion.sourceTitle
                : suggestion.destinationTitle
            }
            className="mt-1 inline-flex max-w-full items-center gap-1 text-sm font-medium text-primary hover:underline"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox checked={completed} onCheckedChange={onCompletedChange} />
          Added
        </label>
      </div>

      <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Suggested anchor text
            </p>
            <p className="mt-1 text-sm font-medium">
              {suggestion.suggestedAnchor}
            </p>
          </div>
          <CopyButton
            value={suggestion.suggestedAnchor}
            successMessage="Copied suggested anchor text"
            label="Copy anchor"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
        <p>
          <span className="font-medium">Why this link: </span>
          <span className="text-foreground/75">{suggestion.reason}</span>
        </p>
        <p>
          <span className="font-medium">Where to add it: </span>
          <span className="text-foreground/75">{suggestion.placement}</span>
        </p>
      </div>
    </div>
  );
}
