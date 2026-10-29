import { createServerFn } from "@tanstack/react-start";
import { PageOptimizerService } from "@/server/features/page-optimizer/services/PageOptimizerService";
import { PageOptimizerHistoryService } from "@/server/features/page-optimizer/services/PageOptimizerHistoryService";
import { PageOptimizerBenchmarkService } from "@/server/features/page-optimizer/services/PageOptimizerBenchmarkService";
import { PageOptimizerInternalLinksService } from "@/server/features/page-optimizer/services/PageOptimizerInternalLinksService";
import { PageOptimizerActionPlanService } from "@/server/features/page-optimizer/services/PageOptimizerActionPlanService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { resolveMarket } from "@/shared/keyword-locations";
import {
  optimizePageSchema,
  pageOptimizerHistorySchema,
  pageOptimizerProjectSchema,
  pageOptimizerTaskUpdateSchema,
} from "@/types/schemas/page-optimizer";

export const optimizePage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(optimizePageSchema)
  .handler(async ({ data, context }) => {
    const result = await PageOptimizerService.optimize({
      url: data.url,
      targetKeyword: data.targetKeyword,
    });
    if (result.ok) {
      await PageOptimizerHistoryService.recordRun({
        projectId: context.projectId,
        createdByUserId: context.userId,
        requestedUrl: data.url,
        result,
      });
    }
    return result;
  });

export const listPageOptimizerHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(pageOptimizerHistorySchema)
  .handler(async ({ data, context }) =>
    PageOptimizerHistoryService.listHistory({
      projectId: context.projectId,
      url: data.url,
      targetKeyword: data.targetKeyword,
    }),
  );

export const listPageOptimizerRecentTargets = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(pageOptimizerProjectSchema)
  .handler(async ({ context }) =>
    PageOptimizerHistoryService.listRecentTargets(context.projectId),
  );

export const benchmarkPage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(optimizePageSchema)
  .handler(async ({ data, context }) =>
    PageOptimizerBenchmarkService.benchmark(
      {
        projectId: context.projectId,
        url: data.url,
        targetKeyword: data.targetKeyword,
        ...resolveMarket({}, context.project),
      },
      { ...context, projectId: context.projectId },
    ),
  );

export const suggestPageInternalLinks = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(optimizePageSchema)
  .handler(async ({ data, context }) =>
    PageOptimizerInternalLinksService.suggest({
      projectId: context.projectId,
      url: data.url,
      targetKeyword: data.targetKeyword,
    }),
  );

export const listPageOptimizerTaskStates = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(optimizePageSchema)
  .handler(async ({ data, context }) =>
    PageOptimizerActionPlanService.listTaskStates({
      projectId: context.projectId,
      url: data.url,
      targetKeyword: data.targetKeyword,
    }),
  );

export const updatePageOptimizerTaskStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(pageOptimizerTaskUpdateSchema)
  .handler(async ({ data, context }) =>
    PageOptimizerActionPlanService.updateTaskStatus({
      projectId: context.projectId,
      userId: context.userId,
      url: data.url,
      targetKeyword: data.targetKeyword,
      taskId: data.taskId,
      status: data.status,
    }),
  );

export const listPageOptimizerAuditTasks = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(optimizePageSchema)
  .handler(async ({ data, context }) =>
    PageOptimizerActionPlanService.listAuditTasks({
      projectId: context.projectId,
      url: data.url,
    }),
  );
