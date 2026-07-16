export const routeGroups = [
  { label: "Home", href: "/" },
  { label: "Raise", href: "/raise" },
  { label: "Citizen", href: "/citizen" },
  { label: "Officer", href: "/officer" },
  { label: "Admin", href: "/admin" },
];

export const foundationMetrics = [
  {
    label: "Route surfaces",
    value: "5",
    detail: "Citizen, officer, admin, raise, and tracking entry points are scaffolded for incremental delivery.",
  },
  {
    label: "Reusable primitives",
    value: "6",
    detail: "Buttons, cards, layout shell, section heading, metric card, and route placeholder patterns are ready.",
  },
  {
    label: "Design tokens",
    value: "14",
    detail: "Core color, surface, border, and semantic state tokens are defined for a consistent visual language.",
  },
  {
    label: "Immediate blockers",
    value: "1",
    detail: "Python is not currently available, so frontend work can progress faster than FastAPI execution for now.",
  },
];

export const foundationRoutes = [
  {
    href: "/raise",
    title: "Raise grievance",
    description: "Reserved for the AI-first complaint composer with natural language, photo, location, and voice affordances.",
  },
  {
    href: "/citizen",
    title: "Citizen dashboard",
    description: "Staged for grievance cards, search, filters, status summaries, and tracking links.",
  },
  {
    href: "/officer",
    title: "Officer workspace",
    description: "Staged for assignment queues, SLA indicators, public updates, and resolution evidence flows.",
  },
  {
    href: "/admin",
    title: "Admin command center",
    description: "Staged for citywide analytics, AI insights, heatmaps, and department performance monitoring.",
  },
  {
    href: "/track",
    title: "Lifecycle tracking",
    description: "Staged for a delivery-style timeline that will show every major grievance status transition.",
  },
];
