import { classifyFetch } from "@/server/lib/audit/classify-fetch";
import { MAX_HTML_BYTES, readTextUpTo } from "@/server/lib/audit/html-response";
import { analyzeHtml } from "@/server/lib/audit/page-analyzer";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { normalizeUrl } from "@/server/lib/audit/url-utils";
import { asAppError } from "@/server/lib/errors";
import { publicFetch } from "@/server/lib/public-fetch";
import {
  buildPageOptimizerChecks,
  countKeywordOccurrences,
} from "@/server/features/page-optimizer/services/pageOptimizerChecks";
import type {
  PageOptimizerFailure,
  PageOptimizerResult,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "OpenSEO-PageOptimizer/1.0 (+https://openseo.so)";

async function normalizeTarget(
  input: string,
): Promise<string | PageOptimizerFailure> {
  try {
    return await normalizeAndValidateStartUrl(input);
  } catch (error) {
    return {
      ok: false,
      reason:
        asAppError(error)?.code === "CRAWL_TARGET_BLOCKED"
          ? "blocked_target"
          : "invalid_url",
    };
  }
}

async function fetchHtml(input: string): Promise<
  | {
      ok: true;
      url: string;
      response: Response;
      html: string;
      elapsedMs: number;
    }
  | PageOptimizerFailure
> {
  let current = input;
  const startedAt = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const normalized = await normalizeTarget(current);
    if (typeof normalized !== "string") return normalized;
    current = normalized;

    let response: Response;
    try {
      response = await publicFetch(current, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, reason: "unreachable" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        return { ok: false, reason: "http_error", statusCode: response.status };
      }
      if (hop === MAX_REDIRECTS) {
        return { ok: false, reason: "too_many_redirects" };
      }
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, reason: "http_error", statusCode: response.status };
    }

    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (!contentType?.includes("text/html")) {
      await response.body?.cancel();
      return { ok: false, reason: "not_html" };
    }

    const html = await readTextUpTo(response, MAX_HTML_BYTES);
    if (
      classifyFetch(
        response.status,
        Boolean(response.headers.get("cf-mitigated")),
        html.slice(0, 4_000),
      ) === "blocked"
    ) {
      return { ok: false, reason: "blocked_by_site" };
    }

    return {
      ok: true,
      url: current,
      response,
      html,
      elapsedMs: Date.now() - startedAt,
    };
  }

  return { ok: false, reason: "too_many_redirects" };
}

async function optimize(input: {
  url: string;
  targetKeyword: string;
}): Promise<PageOptimizerResult> {
  const inspection = await inspect(input);
  return inspection.result;
}

async function inspect(input: { url: string; targetKeyword: string }): Promise<{
  result: PageOptimizerResult;
  bodyText: string;
  links: Array<{
    targetUrl: string;
    anchor: string | null;
    isInternal: boolean;
  }>;
}> {
  const fetched = await fetchHtml(input.url);
  if (!fetched.ok) return { result: fetched, bodyText: "", links: [] };

  const xRobotsTag = fetched.response.headers.get("x-robots-tag");
  const analysis = analyzeHtml(
    fetched.html,
    fetched.url,
    fetched.response.status,
    fetched.elapsedMs,
  );
  const robotsDirectives = [analysis.robotsMeta, xRobotsTag]
    .filter(Boolean)
    .join(",")
    .toLowerCase();
  const indexable = !robotsDirectives.includes("noindex");
  const canonical = analysis.canonical
    ? (normalizeUrl(analysis.canonical, fetched.url) ?? analysis.canonical)
    : null;
  const h1s = analysis.h1s.filter(Boolean).slice(0, 10);
  const imagesMissingAlt = analysis.images.filter(
    (image) => image.alt === null,
  ).length;
  const internalLinks = analysis.links.filter((link) => link.isInternal).length;
  const externalLinks = analysis.links.length - internalLinks;
  const keywordOccurrences = countKeywordOccurrences(
    analysis.bodyText,
    input.targetKeyword,
  );
  const javascriptShell = analysis.javascriptShell === true;

  const page: PageOptimizerSuccess["page"] = {
    title: analysis.title,
    metaDescription: analysis.metaDescription,
    h1s,
    canonical,
    indexable,
    wordCount: analysis.wordCount,
    keywordOccurrences,
    imagesTotal: analysis.images.length,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    hasStructuredData: analysis.hasStructuredData,
  };
  const checks = buildPageOptimizerChecks({
    keyword: input.targetKeyword,
    ...page,
    pageUrl: fetched.url,
    javascriptShell,
  });

  return {
    result: structuredClone({
      ok: true,
      url: fetched.url,
      targetKeyword: input.targetKeyword.trim(),
      statusCode: fetched.response.status,
      responseTimeMs: fetched.elapsedMs,
      coverageWarning: javascriptShell ? "javascript" : null,
      page,
      checks,
    }),
    bodyText: analysis.bodyText,
    links: analysis.links.map((link) => ({
      targetUrl: link.targetUrl,
      anchor: link.anchor,
      isInternal: link.isInternal,
    })),
  };
}

export const PageOptimizerService = { optimize, inspect };
