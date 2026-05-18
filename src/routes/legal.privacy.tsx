import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import { PRIVACY_POLICY } from "@/lib/legal-text";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Witness R.E.P" },
      { name: "description", content: "Witness R.E.P Privacy Policy." },
    ],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
  return (
    <main className="min-h-dvh">
      <ScreenHeader title="Privacy Policy" backTo="/settings" />
      <article className="mx-auto max-w-md whitespace-pre-wrap px-4 py-6 text-[13px] leading-relaxed text-foreground">
        {PRIVACY_POLICY}
      </article>
    </main>
  );
}
