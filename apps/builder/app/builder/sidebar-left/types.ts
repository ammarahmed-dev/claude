export const sidebarPanelNames = [
  "assets",
  "cms",
  "audit",
  "styleSelectors",
  "variables",
  "componentsLibrary",
  "components",
  "navigator",
  "pages",
  "marketplace",
] as const;

export type SidebarPanelName = (typeof sidebarPanelNames)[number] | "none";
