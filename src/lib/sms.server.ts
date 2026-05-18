// Server-only Twilio SMS helper.
import twilio from "twilio";

let client: twilio.Twilio | null = null;

function getTwilioClient() {
  if (client) return client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }

  client = twilio(sid, token);
  return client;
}

export async function sendSms({ to, body }: { to: string; body: string }) {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("Twilio phone number missing (TWILIO_PHONE_NUMBER)");
  }

  const twilioClient = getTwilioClient();
  
  try {
    const message = await twilioClient.messages.create({
      body,
      from,
      to,
    });
    return { sid: message.sid, status: message.status };
  } catch (error) {
    console.error("[Twilio] SMS Send Error:", error);
    throw error;
  }
}
