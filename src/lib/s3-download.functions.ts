import { createServerFn } from "@tanstack/react-start";

const API_URL = "https://connector-gateway.lovable.dev";

export const getS3SignedDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { objectKey: string }) => {
    if (!input || typeof input.objectKey !== "string" || !input.objectKey) {
      throw new Error("objectKey required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const AWS_S3_API_KEY = process.env.AWS_S3_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!AWS_S3_API_KEY) throw new Error("AWS_S3_API_KEY not configured");

    const res = await fetch(`${API_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": AWS_S3_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ object_path: data.objectKey }),
    });
    if (!res.ok) {
      throw new Error(`Sign error [${res.status}]: ${await res.text()}`);
    }
    const json = (await res.json()) as { url: string; expires_in: number };
    return { downloadUrl: json.url, expiresIn: json.expires_in };
  });
