import { createFileRoute } from "@tanstack/react-router";
import { ActionCenterPage } from "@/client/features/action-center/ActionCenterPage";

export const Route = createFileRoute("/_app/p/$projectId/action-center")({
  component: ActionCenterRoute,
});

function ActionCenterRoute() {
  const { projectId } = Route.useParams();
  return <ActionCenterPage projectId={projectId} />;
}
