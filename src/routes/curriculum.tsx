import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/witness/screen-header";
import { AmbassadorBadge } from "@/components/witness/ambassador-badge";
import {
  CURRICULUM,
  SCENARIOS,
  type CurriculumModule,
  type Scenario,
} from "@/lib/witness-curriculum";
import { awardPoints, fetchProfileExtras, type ProfileExtras } from "@/lib/witness-youth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/curriculum")({
  head: () => ({
    meta: [
      { title: "Know Your Rights — Witness R.E.P" },
      {
        name: "description",
        content: "Interactive Know Your Rights curriculum and scenarios for student accounts.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: CurriculumScreen,
});

function CurriculumScreen() {
  const [extras, setExtras] = useState<ProfileExtras | null>(null);

  useEffect(() => {
    void fetchProfileExtras().then(setExtras);
  }, []);

  async function handleAward(points: number, label: string) {
    const updated = await awardPoints(points);
    if (updated) {
      setExtras(updated);
      toast.success(`+${points} points · ${label}`);
    }
  }

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Know Your Rights" />
      <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your progress</p>
          <p className="mt-1 text-3xl font-bold">{extras?.points ?? 0} pts</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {extras?.badges.map((b) => (
              <AmbassadorBadge key={b} id={b} />
            ))}
          </div>
        </div>

        <h2 className="mt-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Modules
        </h2>
        {CURRICULUM.map((m) => (
          <ModuleCard
            key={m.id}
            module={m}
            onComplete={() => handleAward(m.pointsReward, m.title)}
          />
        ))}

        <h2 className="mt-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Scenarios
        </h2>
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.id} scenario={s} onChoice={(pts) => handleAward(pts, s.title)} />
        ))}
      </section>
    </main>
  );
}

function ModuleCard({ module, onComplete }: { module: CurriculumModule; onComplete: () => void }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const q = module.quiz[0];
  const correct = answer === q.answer;

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold">{module.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{module.content}</p>
      <p className="mt-3 text-xs font-semibold">{q.question}</p>
      <div className="mt-2 grid gap-2">
        {q.options?.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setAnswer(opt);
              if (opt === q.answer) onComplete();
            }}
            aria-pressed={answer === opt}
            className={`rounded-xl border px-3 py-2 text-left text-xs ${
              answer === opt
                ? opt === q.answer
                  ? "border-success bg-success/10"
                  : "border-primary bg-primary/10"
                : "border-border bg-background"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {answer && (
        <p className={`mt-2 text-xs ${correct ? "text-success" : "text-primary"}`}>
          {correct ? `Correct! +${module.pointsReward} pts` : "Try again."}
        </p>
      )}
    </article>
  );
}

function ScenarioCard({
  scenario,
  onChoice,
}: {
  scenario: Scenario;
  onChoice: (points: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-bold">{scenario.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{scenario.description}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-primary">
        {scenario.rightsReference}
      </p>
      <div className="mt-3 grid gap-2">
        {scenario.choices.map((c, i) => (
          <button
            key={c.text}
            type="button"
            onClick={() => {
              if (picked !== null) return;
              setPicked(i);
              onChoice(c.points);
            }}
            className={`rounded-xl border px-3 py-2 text-left text-xs ${
              picked === i ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            <p className="font-semibold">{c.text}</p>
            {picked === i && <p className="mt-1 text-[11px] text-muted-foreground">{c.outcome}</p>}
          </button>
        ))}
      </div>
    </article>
  );
}
