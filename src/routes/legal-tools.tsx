import { createFileRoute } from "@tanstack/react-router";
import MainApp from "../../_ARCHIVE/WitnessLegalCourt";

export const Route = createFileRoute("/legal-tools")({
  head: () => ({
    meta: [
      { title: "Legal Terminal — Witness R.E.P" },
      {
        name: "description",
        content:
          "Attorney-client privilege, subpoena resistance, court filing assistant, admissibility checker, and Know Your Rights quick-cards.",
      },
    ],
  }),
  component: MainApp,
});
