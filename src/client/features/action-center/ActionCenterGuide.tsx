import { CheckCircle2 } from "lucide-react";
import {
  ActionStatusSelect,
  type StatusMutation,
} from "@/client/features/action-center/ActionCenterParts";
import { Card, CardContent } from "@/client/components/ui/card";
import type { SeoActionItem } from "@/shared/action-center";

export function LabelGuide() {
  return (
    <section className="space-y-3" aria-labelledby="labels-title">
      <div>
        <h2 id="labels-title" className="text-lg font-semibold">
          What the labels mean
        </h2>
        <p className="text-sm text-muted-foreground">
          Use impact to choose what matters and effort to decide what fits your
          available time.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <GuideCard
          title="Impact"
          text="High means the issue blocks search performance or the data shows meaningful traffic at risk."
        />
        <GuideCard
          title="Effort"
          text="Easy is usually one page edit. Medium needs content or several changes. Hard can involve redirects, development, or careful consolidation."
        />
        <GuideCard
          title="Evidence"
          text="The reason shown comes from Search Console or the latest Site Audit, so you can see why OpenSEO recommended the task."
        />
      </div>
    </section>
  );
}

function GuideCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/15 p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function CompletedActions({
  actions,
  mutation,
}: {
  actions: SeoActionItem[];
  mutation: StatusMutation;
}) {
  return (
    <section className="space-y-3" aria-labelledby="completed-title">
      <div>
        <h2 id="completed-title" className="text-lg font-semibold">
          Completed from the current plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Reopen a task if the work still needs attention.
        </p>
      </div>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {actions.map((action) => (
            <div
              key={action.key}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <span className="font-medium">{action.title}</span>
              </div>
              <ActionStatusSelect action={action} mutation={mutation} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
