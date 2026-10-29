import { createFileRoute } from "@tanstack/react-router";
import { ContentRefreshPage } from "@/client/features/content-refresh/ContentRefreshPage";

export const Route = createFileRoute("/_app/p/$projectId/content-refresh")({
  component: ContentRefreshRoute,
});

function ContentRefreshRoute() {
  const { projectId } = Route.useParams();
  return <ContentRefreshPage projectId={projectId} />;
}
