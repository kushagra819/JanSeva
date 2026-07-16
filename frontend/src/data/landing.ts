import {
  AlertTriangle,
  Lightbulb,
  Trash2,
  TrafficCone,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const heroQuickStats = [
  { label: "Total grievances", value: "18.4k", detail: "citywide logged" },
  { label: "Resolved grievances", value: "14.7k", detail: "closed successfully" },
  { label: "Resolution rate", value: "79.8%", detail: "across departments" },
  { label: "Avg. response time", value: "6.2 hrs", detail: "first action" },
];

export const platformHighlights = [
  {
    label: "AI classification confidence",
    value: "96%",
    detail: "High-confidence routing for common issues like potholes, garbage, lighting, and water supply.",
  },
  {
    label: "Duplicate detection matches",
    value: "17",
    detail: "Nearby reports can be grouped intelligently so departments see community impact earlier.",
  },
  {
    label: "Department handoff speed",
    value: "< 2m",
    detail: "Structured routing means citizens do not have to guess which department owns the issue.",
  },
  {
    label: "Live update coverage",
    value: "24/7",
    detail: "Every grievance can expose status history, notes, evidence, and verification checkpoints.",
  },
];

export const processSteps = [
  {
    title: "Describe your problem",
    description: "Citizens write naturally, attach a photo if needed, and optionally add voice or location context.",
  },
  {
    title: "AI understands it",
    description: "The system extracts keywords, detects location clues, predicts category, and estimates urgency.",
  },
  {
    title: "Automatically routed",
    description: "The grievance is matched to the appropriate civic department with a transparent confidence layer.",
  },
  {
    title: "Track until resolution",
    description: "Citizens see status changes, officer updates, evidence uploads, and a final verification checkpoint.",
  },
];

export const featureCards = [
  {
    title: "Natural-language grievance filing",
    description: "The interface starts with conversation-like reporting instead of forcing a large bureaucratic form.",
  },
  {
    title: "Explainable AI analysis",
    description: "Category, urgency, keywords, location, and routing outputs are shown clearly before final submission.",
  },
  {
    title: "Workflow-aware routing",
    description: "The platform is organized so citizen, officer, and admin roles each see the tools that matter to them.",
  },
  {
    title: "Department-ready case structure",
    description: "Complaints become structured cases that are easier to triage, assign, escalate, and resolve.",
  },
  {
    title: "Citywide visibility",
    description: "Map and analytics surfaces are planned for hotspot detection, category trends, and workload balancing.",
  },
  {
    title: "Government-ready trust signals",
    description: "Status history, evidence, citizen verification, and public transparency make the workflow auditable.",
  },
];

export const aiCapabilities = [
  {
    title: "Complaint category classification",
    description: "Maps everyday complaints into clear civic categories like roads, waste management, water, or streetlights.",
  },
  {
    title: "Department routing recommendation",
    description: "Uses category and context to recommend the most likely responsible department without hiding uncertainty.",
  },
  {
    title: "Priority and urgency scoring",
    description: "Considers risk language, duplicate support count, severity signals, and community impact patterns.",
  },
  {
    title: "Duplicate grievance detection",
    description: "Flags similar nearby complaints so citizens can support an existing issue or continue with a new submission.",
  },
];

export const transparencyPoints = [
  {
    title: "Clear grievance IDs",
    description: "Every case receives a trackable public identifier so citizens always know which grievance they are checking.",
  },
  {
    title: "Visible lifecycle progress",
    description: "Submission, routing, assignment, field work, verification, and resolution stay visible across the timeline.",
  },
  {
    title: "Escalation awareness",
    description: "High-priority and overdue issues can be surfaced clearly instead of disappearing into a general backlog.",
  },
  {
    title: "Performance insights",
    description: "Admin and department dashboards can show resolution rate, workload distribution, and civic issue spikes.",
  },
];

export const heroFloatingIcons: Array<{
  label: string;
  icon: LucideIcon;
  color: string;
  top: string;
  left: string;
}> = [
  { label: "Roads", icon: TrafficCone, color: "text-[var(--warning)]", top: "10%", left: "38%" },
  { label: "Water", icon: Waves, color: "text-[var(--accent-strong)]", top: "24%", left: "70%" },
  { label: "Electricity", icon: Zap, color: "text-[var(--warning)]", top: "56%", left: "78%" },
  { label: "Garbage", icon: Trash2, color: "text-[var(--success)]", top: "74%", left: "60%" },
  { label: "Streetlights", icon: Lightbulb, color: "text-[var(--accent-ai)]", top: "70%", left: "12%" },
  { label: "Public Safety", icon: AlertTriangle, color: "text-[var(--danger)]", top: "28%", left: "4%" },
];
