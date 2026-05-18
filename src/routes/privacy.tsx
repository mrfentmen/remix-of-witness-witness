import { createFileRoute } from "@tanstack/react-router";
import MainApp from "@/Privacy and Advanced Security/WitnessPrivacyPro";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Pro — Witness R.E.P" },
      {
        name: "description",
        content:
          "Advanced privacy controls: auto-blur faces, panic wipe, air gap mode, GPS obfuscation, decoy vault, and stealth masking.",
      },
    ],
  }),
  component: MainApp,
});
