import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  normalizeUrl: vi.fn<(url: string) => Promise<string>>(),
  publicFetch: vi.fn<(url: string) => Promise<Response>>(),
}));

vi.mock("@/server/lib/audit/url-policy", () => ({
  normalizeAndValidateStartUrl: mocks.normalizeUrl,
}));

vi.mock("@/server/lib/public-fetch", () => ({
  publicFetch: mocks.publicFetch,
}));

import { PageOptimizerService } from "@/server/features/page-optimizer/services/PageOptimizerService";

describe("PageOptimizerService", () => {
  beforeEach(() => {
    mocks.normalizeUrl.mockImplementation(async (url) => new URL(url).href);
    mocks.publicFetch.mockResolvedValue(
      new Response("<html></html>", {
        headers: { "content-type": "text/html" },
      }),
    );
  });

  it("turns a fetched page into actionable keyword and page checks", async () => {
    const body = `SEO audit guidance ${"useful page guidance ".repeat(70)}`;
    mocks.publicFetch.mockResolvedValue(
      new Response(
        `<html><head>
          <title>SEO Audit Guide for Growing Websites</title>
          <meta name="description" content="Use this SEO audit guide to find technical and content problems that limit organic growth.">
          <link rel="canonical" href="https://example.com/guide">
        </head><body>
          <h1>Practical SEO Audit Guide</h1><p>${body}</p>
          <img src="missing.jpg"><img src="decorative.jpg" alt="">
          <a href="/services">Services</a><a href="https://other.example/">Reference</a>
        </body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8" } },
      ),
    );

    const result = await PageOptimizerService.optimize({
      url: "https://example.com/guide",
      targetKeyword: "SEO audit",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page).toMatchObject({
      indexable: true,
      imagesTotal: 2,
      imagesMissingAlt: 1,
      internalLinks: 1,
      externalLinks: 1,
    });
    expect(result.page.keywordOccurrences).toBeGreaterThan(0);
    expect(
      result.checks.find((check) => check.id === "title-keyword")?.status,
    ).toBe("pass");
    expect(
      result.checks.find((check) => check.id === "image-alt")?.status,
    ).toBe("improve");
  });

  it("does not report missing headings and thin content from a JavaScript shell", async () => {
    mocks.publicFetch.mockResolvedValue(
      new Response(
        `<html><head><title>Dashboard</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>`,
        { headers: { "content-type": "text/html" } },
      ),
    );

    const result = await PageOptimizerService.optimize({
      url: "https://example.com/app",
      targetKeyword: "SEO dashboard",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.coverageWarning).toBe("javascript");
    expect(result.checks.map((check) => check.id)).toContain(
      "javascript-content",
    );
    expect(result.checks.map((check) => check.id)).not.toContain("h1");
    expect(result.checks.map((check) => check.id)).not.toContain(
      "content-depth",
    );
  });

  it("matches a target keyword written in Arabic", async () => {
    mocks.publicFetch.mockResolvedValue(
      new Response(
        `<html><head><title>دليل تحسين محركات البحث للمبتدئين</title></head><body><h1>تحسين محركات البحث خطوة بخطوة</h1><p>${"معلومات مفيدة للقارئ ".repeat(60)}</p></body></html>`,
        { headers: { "content-type": "text/html" } },
      ),
    );

    const result = await PageOptimizerService.optimize({
      url: "https://example.com/arabic-guide",
      targetKeyword: "تحسين محركات البحث",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.checks.find((check) => check.id === "title-keyword")?.status,
    ).toBe("pass");
    expect(result.checks.find((check) => check.id === "h1")?.status).toBe(
      "pass",
    );
  });

  it("gives copy-ready starting points when the title and H1 miss the keyword", async () => {
    mocks.publicFetch.mockResolvedValue(
      new Response(
        `<html><head><title>Egypt Rest Tours | Tailor-Made Holidays</title></head><body><h1>Discover Egypt Your Way</h1><p>${"Useful travel information for visitors. ".repeat(60)}</p></body></html>`,
        { headers: { "content-type": "text/html" } },
      ),
    );

    const result = await PageOptimizerService.optimize({
      url: "https://egyptresttours.com/",
      targetKeyword: "Egypt tours",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.checks.find((check) => check.id === "title-keyword")?.suggestion,
    ).toBe("Egypt tours | Egypt Rest Tours");
    expect(result.checks.find((check) => check.id === "h1")?.suggestion).toBe(
      "Egypt tours",
    );
  });
});
