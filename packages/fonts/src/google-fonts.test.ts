import { expect, test } from "vitest";
import {
  GOOGLE_FONTS,
  getGoogleFontStack,
  getGoogleFontStylesheetUrl,
  getGoogleFontStylesheetUrls,
} from "./google-fonts";

test("builds one stylesheet address per known family", () => {
  expect(getGoogleFontStylesheetUrl("DM Sans")).toBe(
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@100..1000&display=swap"
  );
  expect(getGoogleFontStylesheetUrl("Lato")).toBe(
    "https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap"
  );
  expect(getGoogleFontStylesheetUrl("Not A Font")).toBe(undefined);
  expect(
    getGoogleFontStylesheetUrls(["Inter", "Inter", "Nope", "Lora"])
  ).toHaveLength(2);
});

test("fallbacks follow the category", () => {
  expect(
    getGoogleFontStack({
      family: "Caveat",
      category: "handwriting",
      weights: "400",
    })
  ).toEqual(["Caveat", "cursive"]);
});

test("the list has no duplicates and well-formed weights", () => {
  const families = GOOGLE_FONTS.map((font) => font.family);
  expect(new Set(families).size).toBe(families.length);
  for (const font of GOOGLE_FONTS) {
    expect(font.weights).toMatch(/^(\d{3,4}\.\.\d{3,4}|\d{3}(;\d{3})*)$/);
  }
});
