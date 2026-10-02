import {
  findGoogleFont,
  getGoogleFontStack,
  getGoogleFontStylesheetUrl,
} from "@webstudio-is/fonts";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

const linkAttribute = "data-bdflow-google-font";

/**
 * Keeps one stylesheet link per Google Fonts family in a document's head,
 * adding new families and removing ones no longer used.
 */
export const syncGoogleFontLinks = (
  document: Document,
  families: readonly string[]
) => {
  const wanted = new Map<string, string>();
  for (const family of families) {
    const url = getGoogleFontStylesheetUrl(family);
    if (url !== undefined) {
      wanted.set(family, url);
    }
  }
  for (const link of Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(`link[${linkAttribute}]`)
  )) {
    const family = link.getAttribute(linkAttribute) ?? "";
    if (wanted.get(family) === link.href) {
      wanted.delete(family);
    } else {
      link.remove();
    }
  }
  for (const [family, url] of wanted) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute(linkAttribute, family);
    document.head.appendChild(link);
  }
};

/** Font stack to store for a picked family, with a fallback for Google Fonts. */
export const getFontStack = (family: string) => {
  const font = findGoogleFont(family);
  return font === undefined ? [family] : getGoogleFontStack(font);
};

/** Remembers a Google Fonts family on the site so it loads when published. */
export const registerGoogleFont = (family: string) => {
  if (findGoogleFont(family) === undefined) {
    return;
  }
  const current = $projectSettings.get()?.meta?.googleFonts ?? [];
  if (current.includes(family)) {
    return;
  }
  try {
    executeRuntimeMutation({
      id: "projectSettings.update",
      input: { meta: { googleFonts: [...current, family] } },
    });
  } catch (error) {
    // the font still shows on the canvas; it is only missing from publishing
    console.error("Could not remember the Google font for publishing", error);
  }
};
