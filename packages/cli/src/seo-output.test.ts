import { describe, expect, test } from "vitest";
import {
  createRobotsTxt,
  createSitemapXml,
  getCanonicalUrl,
  injectBeforeBodyEnd,
  normalizeSiteUrl,
} from "./seo-output";

describe("normalizeSiteUrl", () => {
  test.each([
    ["https://example.com/", "https://example.com"],
    ["example.com", "https://example.com"],
    ["http://example.com/blog//", "http://example.com/blog"],
    ["  ", undefined],
    ["ftp://example.com", undefined],
    ["not a url", undefined],
    [undefined, undefined],
  ])("%s", (input, expected) => {
    expect(normalizeSiteUrl(input)).toBe(expected);
  });
});

test("canonical addresses skip dynamic routes", () => {
  expect(getCanonicalUrl("example.com", "/")).toBe("https://example.com/");
  expect(getCanonicalUrl("example.com", "/about")).toBe(
    "https://example.com/about"
  );
  expect(getCanonicalUrl("example.com", "/blog/:slug")).toBe(undefined);
  expect(getCanonicalUrl(undefined, "/about")).toBe(undefined);
});

describe("createRobotsTxt", () => {
  test("allows everything and points to the sitemap by default", () => {
    expect(createRobotsTxt({ siteUrl: "https://example.com" })).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n"
    );
    expect(createRobotsTxt({})).toBe("User-agent: *\nAllow: /\n");
  });
  test("custom content wins, and hiding the site wins over everything", () => {
    expect(
      createRobotsTxt({ robotsTxt: "User-agent: *\nDisallow: /tmp" })
    ).toBe("User-agent: *\nDisallow: /tmp\n");
    expect(
      createRobotsTxt({ noIndex: true, robotsTxt: "User-agent: *\nAllow: /" })
    ).toBe("User-agent: *\nDisallow: /\n");
  });
});

test("sitemap uses absolute addresses and needs a site address", () => {
  const entries = [
    { path: "/", lastModified: "2026-10-01T10:00:00.000Z" },
    { path: "/a&b", lastModified: "2026-10-02T10:00:00.000Z" },
  ];
  expect(createSitemapXml({ siteUrl: undefined, entries })).toBe(undefined);
  const xml = createSitemapXml({ siteUrl: "example.com", entries })!;
  expect(xml).toContain("<loc>https://example.com/</loc>");
  expect(xml).toContain("<loc>https://example.com/a&amp;b</loc>");
  expect(xml).toContain("<lastmod>2026-10-02</lastmod>");
});

test("body code goes right before the closing body tag", () => {
  expect(
    injectBeforeBodyEnd(
      "<html><body><p>Hi</p></body></html>",
      "<script>x</script>"
    )
  ).toBe("<html><body><p>Hi</p><script>x</script></body></html>");
  expect(injectBeforeBodyEnd("<body></body>", "  ")).toBe("<body></body>");
  expect(injectBeforeBodyEnd("<div></div>", "<b>x</b>")).toBe(
    "<div></div><b>x</b>"
  );
});
