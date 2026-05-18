import { createFileRoute } from "@tanstack/react-router";
import WitnessFeedback from "../../_ARCHIVE/WitnessFeedback";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Witness R.E.P" },
      {
        name: "description",
        content:
          "Help improve Witness R.E.P. Submit bug reports, feature requests, or safety concerns.",
      },
    ],
  }),
  component: WitnessFeedback,
});
