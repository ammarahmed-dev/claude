import { atom } from "nanostores";

export type SectionName =
  | "general"
  | "agents"
  | "auth"
  | "headers"
  | "redirects"
  | "publish"
  | "marketplace"
  | "backups"
  | "integrations"
  | "forms";

export const $openProjectSettings = atom<SectionName | undefined>();
