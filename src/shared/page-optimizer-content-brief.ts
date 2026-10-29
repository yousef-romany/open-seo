import type {
  PageOptimizerBenchmark,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

interface PageOptimizerBriefSection {
  heading: string;
  purpose: string;
  source: "target keyword" | "competitor gap" | "decision support";
}

interface PageOptimizerContentBrief {
  targetKeyword: string;
  contentGoal: string;
  recommendedTitle: string;
  recommendedH1: string;
  wordCountGuidance: string;
  sections: PageOptimizerBriefSection[];
  questions: string[];
  checklist: Array<{ id: string; label: string }>;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) =>
      word ? `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}` : "",
    )
    .join(" ");
}

function suggestedValue(
  result: PageOptimizerSuccess,
  checkIds: string[],
  fallback: string,
): string {
  return (
    result.checks.find(
      (check) => checkIds.includes(check.id) && check.suggestion,
    )?.suggestion ?? fallback
  );
}

function wordCountGuidance(benchmark: PageOptimizerBenchmark): string {
  if (benchmark.medianWordCount === null) {
    return `The current page has ${benchmark.page.wordCount.toLocaleString()} visible words. Use enough space to answer the search intent; no useful competitor median was available.`;
  }
  return `The current page has ${benchmark.page.wordCount.toLocaleString()} visible words and the analyzed competitor median is ${benchmark.medianWordCount.toLocaleString()}. Treat that median as context, not a target: add sections only when they help the reader.`;
}

export function buildPageOptimizerContentBrief(
  result: PageOptimizerSuccess,
  benchmark: PageOptimizerBenchmark,
): PageOptimizerContentBrief {
  const keyword = benchmark.keyword;
  const recommendedTitle = suggestedValue(
    result,
    ["title-keyword", "title-length"],
    result.page.title || titleCase(keyword),
  );
  const recommendedH1 = suggestedValue(
    result,
    ["h1"],
    result.page.h1s[0] || titleCase(keyword),
  );
  const gapSections: PageOptimizerBriefSection[] = benchmark.topicGaps.map(
    (topic) => ({
      heading: titleCase(topic.phrase),
      purpose: `Explain this topic because it appears across ${topic.competitorCount} ranking pages. Keep it only if it helps someone searching for “${keyword}”.`,
      source: "competitor gap",
    }),
  );
  const sections: PageOptimizerBriefSection[] = [
    {
      heading: recommendedH1,
      purpose:
        "Open by confirming what the page offers, who it is for, and the main benefit. Answer the search intent before adding background.",
      source: "target keyword",
    },
    ...gapSections,
    {
      heading: "Compare the Options",
      purpose:
        "Help readers choose by explaining the meaningful differences between options, packages, approaches, or outcomes.",
      source: "decision support",
    },
    {
      heading: "What to Expect",
      purpose:
        "Explain what is included, the process or timeline, important limitations, and anything a visitor should prepare.",
      source: "decision support",
    },
    {
      heading: "Why Trust This Page",
      purpose:
        "Support important claims with specific experience, examples, reviews, policies, credentials, or first-hand evidence.",
      source: "decision support",
    },
    {
      heading: "Next Step",
      purpose:
        "Finish with one clear action that matches the visitor's stage, such as checking availability, requesting details, or continuing to a related page.",
      source: "decision support",
    },
  ];
  const topicQuestions = benchmark.topicGaps
    .slice(0, 3)
    .map((topic) => `What should visitors know about ${topic.phrase}?`);
  const questions = [
    `What should someone understand before choosing or using ${keyword}?`,
    "Which options are available, and who is each option for?",
    "What is included, and what should the visitor expect?",
    ...topicQuestions,
    "What proof or details reduce the visitor's uncertainty?",
    "What should the visitor do next?",
  ];
  const checklist = [
    {
      id: "title",
      label: `Use the recommended title as a starting point and keep “${keyword}” natural.`,
    },
    {
      id: "h1",
      label: "Use one clear H1 that matches the page's promise.",
    },
    ...benchmark.topicGaps.map((topic, index) => ({
      id: `topic-${index}`,
      label: `Review whether “${topic.phrase}” deserves a useful section.`,
    })),
    {
      id: "decisions",
      label: "Explain the choices, inclusions, limitations, and next step.",
    },
    {
      id: "proof",
      label:
        "Support important claims with specific proof or first-hand evidence.",
    },
    {
      id: "links",
      label: "Link to relevant supporting pages with descriptive anchor text.",
    },
    {
      id: "review",
      label:
        "Read the finished page for clarity, then recheck it in Page Optimizer.",
    },
  ];

  return {
    targetKeyword: keyword,
    contentGoal: `Help people searching for “${keyword}” understand their options, trust the information, and take the next useful step.`,
    recommendedTitle,
    recommendedH1,
    wordCountGuidance: wordCountGuidance(benchmark),
    sections,
    questions,
    checklist,
  };
}

export function formatPageOptimizerContentBriefMarkdown(
  brief: PageOptimizerContentBrief,
): string {
  return [
    `# Content brief: ${brief.targetKeyword}`,
    "",
    "## Core direction",
    "",
    `- **Target keyword:** ${brief.targetKeyword}`,
    `- **Content goal:** ${brief.contentGoal}`,
    `- **Recommended title:** ${brief.recommendedTitle}`,
    `- **Recommended H1:** ${brief.recommendedH1}`,
    `- **Content depth:** ${brief.wordCountGuidance}`,
    "",
    "## Suggested outline",
    "",
    ...brief.sections.flatMap((section, index) => [
      `### ${index + 1}. ${section.heading}`,
      "",
      section.purpose,
      "",
      `Source: ${section.source}.`,
      "",
    ]),
    "## Questions to answer",
    "",
    ...brief.questions.map((question) => `- ${question}`),
    "",
    "## Implementation checklist",
    "",
    ...brief.checklist.map((item) => `- [ ] ${item.label}`),
    "",
    "Review every suggestion before publishing so it matches the page, the offer, and the brand voice.",
  ].join("\n");
}
