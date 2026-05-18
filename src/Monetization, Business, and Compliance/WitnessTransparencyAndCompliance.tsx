// WitnessTransparencyAndCompliance.tsx
// Self-contained TypeScript React module for transparency and compliance.
// Features: Open Source Notice, Security Disclosure, Uptime Status Page,
// Changelog, DMCA Takedown, GDPR Compliance, Transparency Report,
// Disaster Recovery, Data Retention, Bug Bounty Program.
// Uses localStorage for mock data, jsPDF for PDF export.
// No external dependencies except React and jsPDF.

import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// ------------------------------
// SECTION: TYPES & HELPERS
// ------------------------------
type StatusType = "operational" | "degraded" | "outage";

interface ServiceStatus {
  id: string;
  name: string;
  status: StatusType;
  uptime90: number; // percentage
}

interface Incident {
  date: string;
  service: string;
  duration: string;
  resolution: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  new: string[];
  improvements: string[];
  fixes: string[];
}

interface DMCARequest {
  id: string;
  name: string;
  email: string;
  copyrightWork: string;
  infringingURL: string;
  submittedAt: number;
}

interface GDPRRequest {
  id: string;
  right: string;
  email: string;
  description: string;
  submittedAt: number;
}

interface BugReport {
  id: string;
  vulnerability: string;
  steps: string;
  impact: string;
  researcherEmail: string;
  trackingNumber: string;
  submittedAt: number;
}

// Helper: generate ID
const genId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// Mock localStorage helpers
const getServiceStatuses = (): ServiceStatus[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("witness_statuses");
  if (stored) return JSON.parse(stored);
  return [
    { id: "rec", name: "Recording and encryption", status: "operational", uptime90: 99.99 },
    { id: "s3", name: "Cloud backup (S3)", status: "operational", uptime90: 99.95 },
    { id: "supabase", name: "Authentication (Supabase)", status: "operational", uptime90: 99.98 },
    { id: "mux", name: "Livestreaming (Mux)", status: "operational", uptime90: 99.97 },
    { id: "map", name: "Map service (Leaflet)", status: "operational", uptime90: 99.99 },
    { id: "push", name: "Push notifications", status: "operational", uptime90: 99.9 },
    { id: "twilio", name: "SMS alerts (Twilio)", status: "operational", uptime90: 99.99 },
    { id: "verify", name: "Public verify page", status: "operational", uptime90: 99.99 },
  ];
};

const saveServiceStatuses = (statuses: ServiceStatus[]) =>
  localStorage.setItem("witness_statuses", JSON.stringify(statuses));

const getIncidents = (): Incident[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("witness_incidents");
  if (stored) return JSON.parse(stored);
  return [
    {
      date: "2025-04-15",
      service: "Push notifications",
      duration: "2 hours",
      resolution: "Fixed API rate limiting",
    },
    {
      date: "2025-03-10",
      service: "Mux",
      duration: "45 minutes",
      resolution: "Upstream provider issue",
    },
  ];
};

const saveIncidents = (incidents: Incident[]) =>
  localStorage.setItem("witness_incidents", JSON.stringify(incidents));

const getDMCARequests = (): DMCARequest[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("witness_dmca_requests");
  return stored ? JSON.parse(stored) : [];
};

const saveDMCARequest = (req: DMCARequest) => {
  const list = getDMCARequests();
  list.push(req);
  localStorage.setItem("witness_dmca_requests", JSON.stringify(list));
};

const getGDPRRequests = (): GDPRRequest[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("witness_gdpr_requests");
  return stored ? JSON.parse(stored) : [];
};

const saveGDPRRequest = (req: GDPRRequest) => {
  const list = getGDPRRequests();
  list.push(req);
  localStorage.setItem("witness_gdpr_requests", JSON.stringify(list));
};

const getBugReports = (): BugReport[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("witness_bug_bounty");
  return stored ? JSON.parse(stored) : [];
};

const saveBugReport = (report: BugReport) => {
  const list = getBugReports();
  list.push(report);
  localStorage.setItem("witness_bug_bounty", JSON.stringify(list));
};
