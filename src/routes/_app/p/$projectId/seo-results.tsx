import { createFileRoute } from "@tanstack/react-router";
import { SeoResultsPage } from "@/client/features/seo-results/SeoResultsPage";

export const Route = createFileRoute("/_app/p/$projectId/seo-results")({
  component: SeoResultsRoute,
});

function SeoResultsRoute() {
  const { projectId } = Route.useParams();
  return <SeoResultsPage projectId={projectId} />;
}
