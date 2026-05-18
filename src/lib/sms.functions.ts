import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendSms } from "./sms.server";

/**
 * SENIOR AUDIT FIX: Real Twilio Integration for SOS and Verification.
 * This replaces the "phantom" sms: links with real automated SMS alerts.
 */

const SmsInput = z.object({
  to: z.string().min(5).max(30),
  body: z.string().min(1).max(1600),
});

export const sendSosSms = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SmsInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const result = await sendSms({
        to: data.to,
        body: data.body,
      });
      return { ok: true, sid: result.sid };
    } catch (error) {
      console.error("[SMS Functions] Failed to send SOS SMS:", error);
      throw new Error("Failed to send SMS via Twilio");
    }
  });

export const sendVerificationSms = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SmsInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const result = await sendSms({
        to: data.to,
        body: data.body,
      });
      return { ok: true, sid: result.sid };
    } catch (error) {
      console.error("[SMS Functions] Failed to send Verification SMS:", error);
      throw new Error("Failed to send Verification SMS");
    }
  });
