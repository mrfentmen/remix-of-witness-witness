import { createFileRoute } from "@tanstack/react-router";
import WitnessSafeCorridor from "@/SOS and Emergency/WitnessSafeCorridor";

export const Route = createFileRoute("/safe-corridor")({
  head: () => ({
    meta: [
      { title: "Safe Corridor — Witness R.E.P" },
      {
        name: "description",
        content:
          "Set a destination and timer. If the timer expires before you check in, emergency contacts get your last GPS location.",
      },
    ],
  }),
  component: WitnessSafeCorridor,
});
