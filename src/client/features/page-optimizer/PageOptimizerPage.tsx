import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { PageOptimizerResults } from "@/client/features/page-optimizer/PageOptimizerResults";
import { PageOptimizerHistory } from "@/client/features/page-optimizer/PageOptimizerHistory";
import { PageOptimizerRecentTargets } from "@/client/features/page-optimizer/PageOptimizerRecentTargets";
import {
  listPageOptimizerHistory,
  listPageOptimizerRecentTargets,
  optimizePage,
} from "@/serverFunctions/page-optimizer";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

type Props = {
  projectId: string;
  initialUrl: string;
  initialKeyword: string;
  onOptimize: (url: string, keyword: string) => void;
};

export function PageOptimizerPage({
  projectId,
  initialUrl,
  initialKeyword,
  onOptimize,
}: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [comparisonBaseline, setComparisonBaseline] =
    useState<PageOptimizerSuccess | null>(null);
  const queryClient = useQueryClient();
  const activeUrl = initialUrl.trim();
  const activeKeyword = initialKeyword.trim();
  const hasActiveOptimization = activeUrl !== "" && activeKeyword !== "";

  useEffect(() => {
    setUrl(initialUrl);
    setKeyword(initialKeyword);
    setValidationError(null);
    setComparisonBaseline(null);
  }, [initialKeyword, initialUrl]);

  const query = useQuery({
    queryKey: ["page-optimizer", projectId, activeUrl, activeKeyword],
    queryFn: () =>
      optimizePage({
        data: {
          projectId,
          url: activeUrl,
          targetKeyword: activeKeyword,
        },
      }),
    enabled: hasActiveOptimization,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ["page-optimizer-history", projectId, activeUrl, activeKeyword],
    queryFn: () =>
      listPageOptimizerHistory({
        data: {
          projectId,
          url: activeUrl,
          targetKeyword: activeKeyword,
        },
      }),
    enabled: query.data?.ok === true,
    staleTime: 30_000,
    retry: false,
  });

  const recentTargetsQuery = useQuery({
    queryKey: ["page-optimizer-recent-targets", projectId],
    queryFn: () => listPageOptimizerRecentTargets({ data: { projectId } }),
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!query.data?.ok || query.dataUpdatedAt === 0) return;
    void queryClient.invalidateQueries({
      queryKey: ["page-optimizer-history", projectId, activeUrl, activeKeyword],
    });
    void queryClient.invalidateQueries({
      queryKey: ["page-optimizer-recent-targets", projectId],
    });
  }, [
    activeKeyword,
    activeUrl,
    projectId,
    query.data,
    query.dataUpdatedAt,
    queryClient,
  ]);

  const recheckPage = () => {
    if (query.data?.ok) setComparisonBaseline(query.data);
    void query.refetch();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = url.trim();
    const nextKeyword = keyword.trim();
    if (!nextUrl || !nextKeyword) {
      setValidationError("Enter both a page URL and one target keyword.");
      return;
    }
    setValidationError(null);
    if (nextUrl === activeUrl && nextKeyword === activeKeyword) {
      recheckPage();
      return;
    }
    onOptimize(nextUrl, nextKeyword);
  };

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Page Optimizer"
          description="Check one page against one target keyword and get a prioritized list of changes."
        />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Choose a page and its main keyword</h2>
            </CardTitle>
            <CardDescription>
              Use the exact page you want to improve. This check uses no SEO
              data credits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start"
              onSubmit={handleSubmit}
            >
              <Field data-invalid={validationError ? true : undefined}>
                <FieldLabel htmlFor="optimizer-url">Page URL</FieldLabel>
                <Input
                  id="optimizer-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/service"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setValidationError(null);
                  }}
                  aria-invalid={validationError ? true : undefined}
                />
                <FieldDescription>
                  The public page OpenSEO should read and analyze.
                </FieldDescription>
              </Field>

              <Field data-invalid={validationError ? true : undefined}>
                <FieldLabel htmlFor="optimizer-keyword">
                  Target keyword
                </FieldLabel>
                <Input
                  id="optimizer-keyword"
                  placeholder="e.g. technical SEO audit"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setValidationError(null);
                  }}
                  aria-invalid={validationError ? true : undefined}
                />
                <FieldDescription>
                  Pick one main search phrase for this page.
                </FieldDescription>
              </Field>

              <Button
                type="submit"
                className="mt-6 w-full md:w-auto"
                pending={query.isFetching && hasActiveOptimization}
              >
                {query.data ? "Recheck page" : "Optimize page"}
              </Button>

              {validationError ? (
                <FieldError className="md:col-span-3">
                  {validationError}
                </FieldError>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {hasActiveOptimization ? (
          <>
            <QueryState
              query={query}
              errorFallback="We couldn't analyze this page."
            >
              {(result) => (
                <PageOptimizerResults
                  key={`${activeUrl}\n${activeKeyword}`}
                  projectId={projectId}
                  result={result}
                  previousResult={query.isFetching ? null : comparisonBaseline}
                  onRecheck={recheckPage}
                  isRechecking={query.isFetching}
                />
              )}
            </QueryState>
            {query.data?.ok ? (
              <PageOptimizerHistory
                entries={historyQuery.data ?? []}
                loading={historyQuery.isLoading}
                failed={historyQuery.isError}
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="Optimize your first page"
            description="Enter a public page URL and the one keyword you want that page to rank for."
          />
        )}

        <PageOptimizerRecentTargets
          entries={recentTargetsQuery.data ?? []}
          activeUrl={activeUrl}
          activeKeyword={activeKeyword}
          onOpen={onOptimize}
        />
      </div>
    </div>
  );
}
