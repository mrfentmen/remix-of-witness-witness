import { createFileRoute } from "@tanstack/react-router";
import WitnessScheduledCheckIn from "../../_ARCHIVE/WitnessScheduledCheckIn";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [
      { title: "Scheduled Check-in — Witness R.E.P" },
      {
        name: "description",
        content:
          "Set up automatic safety check-ins. If you don't check in on time, your emergency contacts are notified.",
      },
    ],
  }),
  component: WitnessScheduledCheckIn,
});
