export const sidebarPanelNames = [
  "assets",
  "cms",
  "audit",
  "components",
  "navigator",
  "pages",
  "marketplace",
] as const;

export type SidebarPanelName = (typeof sidebarPanelNames)[number] | "none";
