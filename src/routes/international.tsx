import { createFileRoute } from "@tanstack/react-router";
import MainApp from "@/Evidence Forensics and Legal/WitnessGlobalInternational";

export const Route = createFileRoute("/international")({
  head: () => ({
    meta: [
      { title: "Witness Global — Witness R.E.P" },
      {
        name: "description",
        content:
          "International jurisdiction detection, multi-currency donations, global SOS contacts, and cross-border legal rights.",
      },
    ],
  }),
  component: MainApp,
});
