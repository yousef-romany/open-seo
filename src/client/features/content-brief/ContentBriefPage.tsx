import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BarChart3, FileText, Search } from "lucide-react";
import { PageHeader } from "@/client/components/PageHeader";
import { QueryError } from "@/client/components/QueryState";
import { PageOptimizerContentBrief } from "@/client/features/page-optimizer/PageOptimizerContentBrief";
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
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { benchmarkPage, optimizePage } from "@/serverFunctions/page-optimizer";
import type {
  PageOptimizerBenchmark,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

type BriefResult = {
  page: PageOptimizerSuccess;
  benchmark: PageOptimizerBenchmark;
};

export function ContentBriefPage({ projectId }: { projectId: string }) {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: { url: string; keyword: string }) => {
      const page = await optimizePage({
        data: {
          projectId,
          url: input.url,
          targetKeyword: input.keyword,
        },
      });
      if (!page.ok) {
        throw new Error(
          "OpenSEO couldn't read this page. Check that the URL is public and try again.",
        );
      }
      const benchmark = await benchmarkPage({
        data: {
          projectId,
          url: page.url,
          targetKeyword: input.keyword,
        },
      });
      return { page, benchmark } satisfies BriefResult;
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = url.trim();
    const nextKeyword = keyword.trim();
    if (!nextUrl || !nextKeyword) {
      setValidationError("Enter both a page URL and one target keyword.");
      return;
    }
    setValidationError(null);
    mutation.mutate({ url: nextUrl, keyword: nextKeyword });
  };

  return (
    <div className="px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          title="Content Brief Builder"
          description="Turn a target keyword and the pages already ranking for it into a practical writing plan."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2>Build a brief for one page</h2>
            </CardTitle>
            <CardDescription>
              OpenSEO reads your page and up to five ranking competitors. A
              fresh Google search costs about 5 SEO credits; cached results use
              no extra credits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start"
              onSubmit={submit}
            >
              <Field data-invalid={validationError ? true : undefined}>
                <FieldLabel htmlFor="brief-url">Page URL</FieldLabel>
                <Input
                  id="brief-url"
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
                  Use the page you will write or improve.
                </FieldDescription>
              </Field>
              <Field data-invalid={validationError ? true : undefined}>
                <FieldLabel htmlFor="brief-keyword">Target keyword</FieldLabel>
                <Input
                  id="brief-keyword"
                  placeholder="e.g. Egypt tours"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setValidationError(null);
                  }}
                  aria-invalid={validationError ? true : undefined}
                />
                <FieldDescription>Choose one primary query.</FieldDescription>
              </Field>
              <Button
                type="submit"
                className="mt-6 w-full md:w-auto"
                pending={mutation.isPending}
              >
                <Search data-icon="inline-start" />
                Build brief
              </Button>
              {validationError ? (
                <FieldError className="md:col-span-3">
                  {validationError}
                </FieldError>
              ) : null}
            </form>
          </CardContent>
        </Card>

        {mutation.isError ? (
          <QueryError
            error={mutation.error}
            fallback="We couldn't build this content brief."
            onRetry={() =>
              mutation.mutate({ url: url.trim(), keyword: keyword.trim() })
            }
            isRetrying={mutation.isPending}
            variant="page"
          />
        ) : null}

        {mutation.data ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <h2>Evidence used</h2>
                </CardTitle>
                <CardDescription>
                  These numbers explain where the recommendations came from.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Evidence
                  label="Competitors read"
                  value={`${mutation.data.benchmark.analyzedCompetitorCount}/${mutation.data.benchmark.competitors.length}`}
                />
                <Evidence
                  label="Your words"
                  value={mutation.data.page.page.wordCount.toLocaleString()}
                />
                <Evidence
                  label="Competitor median"
                  value={
                    mutation.data.benchmark.medianWordCount?.toLocaleString() ??
                    "Not available"
                  }
                />
                <Evidence
                  label="Topic gaps"
                  value={mutation.data.benchmark.topicGaps.length.toLocaleString()}
                />
              </CardContent>
            </Card>
            <PageOptimizerContentBrief
              benchmark={mutation.data.benchmark}
              result={mutation.data.page}
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    to="/p/$projectId/page-optimizer"
                    params={{ projectId }}
                    search={{
                      url: mutation.data.page.url,
                      keyword: mutation.data.page.targetKeyword,
                    }}
                  />
                }
              >
                Open the full Page Optimizer
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <Badge variant="outline">{label}</Badge>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
