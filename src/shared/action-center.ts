export type SeoActionStatus = "todo" | "in_progress" | "done";
export type SeoActionSource =
  | "content_refresh"
  | "cannibalization"
  | "site_audit";
export type SeoActionLevel = "high" | "medium" | "low";
export type SeoActionDifficulty = "easy" | "medium" | "hard";
export type SeoActionTool =
  | "page_optimizer"
  | "content_refresh"
  | "cannibalization"
  | "site_audit";

export interface SeoActionItem {
  key: string;
  source: SeoActionSource;
  title: string;
  why: string;
  evidence: string;
  steps: string[];
  impact: SeoActionLevel;
  difficulty: SeoActionDifficulty;
  status: SeoActionStatus;
  tool: SeoActionTool;
  url?: string;
  keyword?: string;
}

export interface SeoActionCenterReport {
  generatedAt: string;
  actions: SeoActionItem[];
  startHere: SeoActionItem[];
  weeklyPlan: SeoActionItem[];
  sources: {
    gscConnected: boolean;
    auditAvailable: boolean;
  };
  summary: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    highImpact: number;
  };
}
