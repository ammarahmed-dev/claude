export const sidebarPanelNames = [
  "assets",
  "cms",
  "audit",
  "styleSelectors",
  "components",
  "navigator",
  "pages",
  "marketplace",
] as const;

export type SidebarPanelName = (typeof sidebarPanelNames)[number] | "none";
