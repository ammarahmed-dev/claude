import { expect, test } from "vitest";
import { isValidLanguageCode, isValidSiteUrl } from "./section-seo";

test("site address accepts a bare host or an http address", () => {
  for (const ok of [
    "",
    "example.com",
    "https://example.com",
    "http://a.b.co/blog",
  ]) {
    expect(isValidSiteUrl(ok)).toBe(true);
  }
  for (const bad of [
    "localhost",
    "https://example.com/?a=1",
    "https://example.com/#x",
    "not a url",
  ]) {
    expect(isValidSiteUrl(bad)).toBe(false);
  }
});

test("language codes follow BCP 47 shape", () => {
  for (const ok of ["", "en", "de", "pt-BR", "zh-Hant"]) {
    expect(isValidLanguageCode(ok)).toBe(true);
  }
  for (const bad of ["English", "e", "en_US", "123"]) {
    expect(isValidLanguageCode(bad)).toBe(false);
  }
});
