import { createFileRoute } from "@tanstack/react-router";
import MainApp from "../../_ARCHIVE/WitnessAIForensics";

export const Route = createFileRoute("/forensics")({
  head: () => ({
    meta: [
      { title: "Forensic Terminal — Witness R.E.P" },
      {
        name: "description",
        content:
          "Chain of custody, admissibility scoring, court filing assistant, incident reports, GPS timeline, and evidence bundle export.",
      },
    ],
  }),
  component: MainApp,
});
