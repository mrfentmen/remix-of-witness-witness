import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PhoneEmailOtp } from "@/components/witness/phone-email-otp";
import { setProfileType } from "@/lib/witness-youth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Witness R.E.P" },
      {
        name: "description",
        content: "Create your Witness R.E.P account to sync your encrypted vault across devices.",
      },
    ],
  }),
  component: SignUpScreen,
});

function SignUpScreen() {
  const [isStudent, setIsStudent] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);

  return (
    <PhoneEmailOtp
      heading="Create Account"
      subhead="Sign up to keep your encrypted vault recoverable across devices. Your recordings stay end-to-end encrypted — only your PIN unlocks them."
      footerPrompt="Already have an account?"
      footerLinkLabel="Log in"
      footerTo="/login"
      isLogin={false}
      extraFields={
        <div className="rounded-2xl border border-border bg-card p-4 text-xs">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isStudent}
              onChange={(e) => setIsStudent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-semibold text-foreground">Student account</span>
              <span className="text-muted-foreground">
                Filter map content for under-18 users and unlock the Know Your Rights curriculum.
              </span>
            </span>
          </label>
          {isStudent && (
            <label className="mt-3 flex items-start gap-3 border-t border-border pt-3">
              <input
                type="checkbox"
                checked={parentalConsent}
                onChange={(e) => setParentalConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-muted-foreground">
                I confirm a parent or guardian has approved this account.
              </span>
            </label>
          )}
        </div>
      }
      onAfterVerify={async () => {
        if (isStudent && parentalConsent) {
          await setProfileType("student");
        }
      }}
    />
  );
}
