import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { TERMS_OF_SERVICE } from "@/lib/legal-text";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Witness R.E.P" },
      { name: "description", content: "Witness R.E.P Terms of Service." },
    ],
  }),
  component: TermsScreen,
});

function TermsScreen() {
  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Terms of Service" backTo="/settings" />
      <article className="mx-auto max-w-md whitespace-pre-wrap px-4 py-6 text-[13px] leading-relaxed text-foreground">
        {TERMS_OF_SERVICE}
      </article>
    </main>
  );
}
