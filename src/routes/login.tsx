import { createFileRoute } from "@tanstack/react-router";
import { PhoneEmailOtp } from "@/components/witness/phone-email-otp";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Witness R.E.P" },
      {
        name: "description",
        content: "Log in to Witness R.E.P to sync your encrypted vault.",
      },
    ],
  }),
  component: LoginScreen,
});

function LoginScreen() {
  return (
    <PhoneEmailOtp
      heading="Welcome Back"
      subhead="Log in to sync your encrypted vault across devices."
      footerPrompt="No account yet?"
      footerLinkLabel="Create one"
      footerTo="/signup"
      isLogin
    />
  );
}
