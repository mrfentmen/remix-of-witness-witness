import { createFileRoute } from "@tanstack/react-router";
import WitnessCommunityAlert from "../../_ARCHIVE/WitnessCommunityAlert";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Alerts — Witness R.E.P" },
      {
        name: "description",
        content:
          "Verified organizational dispatch and community alerts. See live alerts from trusted organizations in your area.",
      },
    ],
  }),
  component: WitnessCommunityAlert,
});
