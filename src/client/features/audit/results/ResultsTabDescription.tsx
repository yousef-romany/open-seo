export type ResultsTab = "issues" | "on-page" | "pages" | "performance";

export const ON_PAGE_ISSUE_TYPES = new Set([
  "missing-title",
  "duplicate-title",
  "title-too-long",
  "title-too-short",
  "missing-meta-description",
  "duplicate-meta-description",
  "meta-description-too-long",
  "meta-description-too-short",
  "missing-h1",
  "multiple-h1",
  "heading-order-skip",
  "thin-content",
  "duplicate-content",
  "images-missing-alt",
]);

export function ResultsTabDescription({ activeTab }: { activeTab: string }) {
  if (activeTab === "on-page") {
    return (
      <div className="space-y-1">
        <p>
          <span className="font-medium text-foreground">Start here:</span> fix
          Critical items first, then Warnings. Open any check to see what it
          means, how to fix it, and every affected page.
        </p>
        <p className="text-xs">
          These checks cover page titles, search descriptions, headings, content
          quality, and image descriptions. Re-run the audit after your changes
          to confirm the fixes.
        </p>
      </div>
    );
  }

  if (activeTab === "issues") {
    return "Open an issue to understand why it matters, how to fix it, and which pages need work.";
  }
  if (activeTab === "pages") {
    return "One row per crawled page. Use this view to inspect status, indexability, titles, headings, content, and links.";
  }
  return "Page-speed and quality checks from Lighthouse. Lower scores need attention first.";
}
