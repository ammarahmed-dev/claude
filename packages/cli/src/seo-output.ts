/**
 * Site-wide SEO output for static builds: robots.txt, sitemap.xml, canonical
 * addresses and code injected before the closing body tag.
 */

/** Normalizes a site address to `https://host[/base]` without a trailing slash. */
export const normalizeSiteUrl = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === "") {
    return;
  }
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return;
  }
};

/** Canonical address of a page, or undefined for dynamic routes. */
export const getCanonicalUrl = (
  siteUrl: string | undefined,
  pagePath: string
) => {
  const base = normalizeSiteUrl(siteUrl);
  if (base === undefined || pagePath.includes(":") || pagePath.includes("*")) {
    return;
  }
  return pagePath === "/" || pagePath === ""
    ? `${base}/`
    : `${base}${pagePath}`;
};

export const createRobotsTxt = ({
  robotsTxt,
  noIndex,
  siteUrl,
}: {
  robotsTxt?: string;
  noIndex?: boolean;
  siteUrl?: string;
}) => {
  if (noIndex === true) {
    return "User-agent: *\nDisallow: /\n";
  }
  const custom = robotsTxt?.trim();
  if (custom) {
    return `${custom}\n`;
  }
  const base = normalizeSiteUrl(siteUrl);
  return [
    "User-agent: *",
    "Allow: /",
    ...(base ? ["", `Sitemap: ${base}/sitemap.xml`] : []),
    "",
  ].join("\n");
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[char]!
  );

export const createSitemapXml = ({
  siteUrl,
  entries,
}: {
  siteUrl: string | undefined;
  entries: Array<{ path: string; lastModified: string }>;
}) => {
  const base = normalizeSiteUrl(siteUrl);
  if (base === undefined) {
    return;
  }
  const urls = entries
    .map((entry) => {
      const loc = entry.path === "/" ? `${base}/` : `${base}${entry.path}`;
      const lastmod = entry.lastModified.slice(0, 10);
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

/** Inserts code right before the last closing body tag of an HTML document. */
export const injectBeforeBodyEnd = (html: string, code: string | undefined) => {
  if (code === undefined || code.trim() === "") {
    return html;
  }
  const index = html.toLowerCase().lastIndexOf("</body>");
  if (index === -1) {
    return `${html}${code}`;
  }
  return `${html.slice(0, index)}${code}${html.slice(index)}`;
};
