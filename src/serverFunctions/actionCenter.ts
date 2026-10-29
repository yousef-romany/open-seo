import { createServerFn } from "@tanstack/react-start";
import { ActionCenterService } from "@/server/features/action-center/services/ActionCenterService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  actionCenterInputSchema,
  actionCenterStatusSchema,
} from "@/types/schemas/action-center";

export const getActionCenterReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(actionCenterInputSchema)
  .handler(async ({ context }) =>
    ActionCenterService.getReport(context.projectId),
  );

export const updateActionCenterStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(actionCenterStatusSchema)
  .handler(async ({ data, context }) =>
    ActionCenterService.updateStatus({
      projectId: context.projectId,
      userId: context.userId,
      actionKey: data.actionKey,
      status: data.status,
    }),
  );
