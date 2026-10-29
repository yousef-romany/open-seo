import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageOptimizerPage } from "@/client/features/page-optimizer/PageOptimizerPage";
import { pageOptimizerSearchSchema } from "@/types/schemas/page-optimizer";

export const Route = createFileRoute("/_app/p/$projectId/page-optimizer")({
  validateSearch: pageOptimizerSearchSchema,
  remountDeps: ({ params }) => params.projectId,
  component: PageOptimizerRoute,
});

function PageOptimizerRoute() {
  const { projectId } = Route.useParams();
  const { url = "", keyword = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <PageOptimizerPage
      projectId={projectId}
      initialUrl={url}
      initialKeyword={keyword}
      onOptimize={(nextUrl, nextKeyword) => {
        void navigate({
          search: { url: nextUrl, keyword: nextKeyword },
          replace: true,
        });
      }}
    />
  );
}
