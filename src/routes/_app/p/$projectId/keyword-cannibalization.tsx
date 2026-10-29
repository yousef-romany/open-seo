import { createFileRoute } from "@tanstack/react-router";
import { KeywordCannibalizationPage } from "@/client/features/keyword-cannibalization/KeywordCannibalizationPage";

export const Route = createFileRoute(
  "/_app/p/$projectId/keyword-cannibalization",
)({ component: KeywordCannibalizationRoute });

function KeywordCannibalizationRoute() {
  const { projectId } = Route.useParams();
  return <KeywordCannibalizationPage projectId={projectId} />;
}
