import { createFileRoute } from "@tanstack/react-router";
import WitnessNetwork from "../../_ARCHIVE/WitnessNetwork";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Witness Network — Witness R.E.P" },
      {
        name: "description",
        content:
          "Join the peer-to-peer witness network. Alert nearby users or observe incidents in your area.",
      },
    ],
  }),
  component: WitnessNetwork,
});
