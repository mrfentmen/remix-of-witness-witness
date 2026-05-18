// Server functions for transparency & compliance: GDPR requests, DMCA notices.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

// ── GDPR Request ──
const GdprInput = z.object({
  right: z.enum(["access", "erasure", "portability", "objection"]),
  email: z.string().email().max(320),
  description: z.string().max(2000).default(""),
});

export const submitGdprRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GdprInput.parse(input))
  .handler(async ({ data }): Promise<{ ref: string; ok: boolean }> => {
    const ref = `GDPR-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabaseAdmin.from("reports").insert({
      report_type: "gdpr",
      title: `GDPR ${data.right} request`,
      description: `Right: ${data.right}\nEmail: ${data.email}\nDescription: ${data.description}`,
      status: "open",
      reference_id: ref,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[witness] Failed to store GDPR request", error);
      // Don't expose error details to client; return generic failure
      return { ref, ok: false };
    }

    console.log("[witness] GDPR request stored", ref);
    return { ref, ok: true };
  });

// ── DMCA Takedown ──
const DmcaInput = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(320),
  work: z.string().min(1).max(2000),
  url: z.string().min(1).max(2000),
});

export const submitDmcaNotice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DmcaInput.parse(input))
  .handler(async ({ data }): Promise<{ ref: string; ok: boolean }> => {
    const ref = `DMCA-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabaseAdmin.from("reports").insert({
      report_type: "dmca",
      title: `DMCA notice from ${data.name}`,
      description: `Name: ${data.name}\nEmail: ${data.email}\nWork: ${data.work}\nURL: ${data.url}`,
      status: "open",
      reference_id: ref,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[witness] Failed to store DMCA notice", error);
      return { ref, ok: false };
    }

    console.log("[witness] DMCA notice stored", ref);
    return { ref, ok: true };
  });

// ── Government Request Counter ──
// Stored as a special row in service_status (id = "govt_requests")
// Only admins can update this value.
export const getGovtRequestCount = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ count: number }> => {
    const { data, error } = await supabaseAdmin
      .from("service_status")
      .select("name")
      .eq("id", "govt_requests")
      .maybeSingle();

    if (error || !data) return { count: 0 };
    // The "name" field stores the count as a string (hack-free reuse of existing table)
    const parsed = parseInt(data.name, 10);
    return { count: Number.isFinite(parsed) ? parsed : 0 };
  },
);

// ── Quarterly Transparency Reports ──
export interface TransparencyReport {
  id: string;
  quarter: string;
  report_data: Json;
  published_at: string;
}

export const getTransparencyReports = createServerFn({ method: "GET" }).handler(
  async (): Promise<TransparencyReport[]> => {
    const { data, error } = await supabaseAdmin
      .from("transparency_reports")
      .select("id, quarter, report_data, published_at")
      .order("quarter", { ascending: false })
      .limit(8);

    if (error || !data) return [];
    return data as TransparencyReport[];
  },
);
