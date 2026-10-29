import { createFileRoute } from "@tanstack/react-router";
import { ContentBriefPage } from "@/client/features/content-brief/ContentBriefPage";

export const Route = createFileRoute("/_app/p/$projectId/content-brief")({
  component: ContentBriefRoute,
});

function ContentBriefRoute() {
  const { projectId } = Route.useParams();
  return <ContentBriefPage projectId={projectId} />;
}
