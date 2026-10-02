/**
 * Third-party integrations for the published site.
 *
 * Each integration is stored as a marked block inside the project's custom
 * head code, so publishing needs no extra support and the code stays visible
 * and editable in the Custom code editor.
 */

export type IntegrationId =
  | "ga4"
  | "gtm"
  | "plausible"
  | "metaPixel"
  | "clarity"
  | "googleVerification"
  | "bingVerification";

type IntegrationDefinition = {
  id: IntegrationId;
  group: "Analytics" | "Marketing" | "Search engines";
  label: string;
  description: string;
  placeholder: string;
  inputLabel: string;
  pattern: RegExp;
  render: (value: string) => string;
};

export const integrations: readonly IntegrationDefinition[] = [
  {
    id: "ga4",
    group: "Analytics",
    label: "Google Analytics 4",
    description: "Track visits with a GA4 measurement ID.",
    inputLabel: "Measurement ID",
    placeholder: "G-XXXXXXXXXX",
    pattern: /^G-[A-Z0-9]{4,}$/,
    render: (id) =>
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${id}");</script>`,
  },
  {
    id: "gtm",
    group: "Analytics",
    label: "Google Tag Manager",
    description: "Load a Tag Manager container on every page.",
    inputLabel: "Container ID",
    placeholder: "GTM-XXXXXXX",
    pattern: /^GTM-[A-Z0-9]{4,}$/,
    render: (id) =>
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","${id}");</script>`,
  },
  {
    id: "plausible",
    group: "Analytics",
    label: "Plausible",
    description: "Privacy-friendly analytics without cookies.",
    inputLabel: "Site domain",
    placeholder: "example.com",
    pattern: /^(?=.{3,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/i,
    render: (domain) =>
      `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`,
  },
  {
    id: "clarity",
    group: "Analytics",
    label: "Microsoft Clarity",
    description: "Session recordings and heatmaps.",
    inputLabel: "Project ID",
    placeholder: "abcdefghij",
    pattern: /^[a-z0-9]{6,12}$/,
    render: (id) =>
      `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");</script>`,
  },
  {
    id: "metaPixel",
    group: "Marketing",
    label: "Meta Pixel",
    description: "Measure ads and build audiences on Facebook and Instagram.",
    inputLabel: "Pixel ID",
    placeholder: "123456789012345",
    pattern: /^\d{6,20}$/,
    render: (id) =>
      `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","${id}");fbq("track","PageView");</script>`,
  },
  {
    id: "googleVerification",
    group: "Search engines",
    label: "Google Search Console",
    description: "Verify ownership with the HTML tag method.",
    inputLabel: "Verification code",
    placeholder: "Content value of the meta tag",
    pattern: /^[A-Za-z0-9_-]{10,100}$/,
    render: (token) =>
      `<meta name="google-site-verification" content="${token}">`,
  },
  {
    id: "bingVerification",
    group: "Search engines",
    label: "Bing Webmaster Tools",
    description: "Verify ownership with the meta tag method.",
    inputLabel: "Verification code",
    placeholder: "32-character code",
    pattern: /^[A-Fa-f0-9]{32}$/,
    render: (token) => `<meta name="msvalidate.01" content="${token}">`,
  },
];

export const isValidIntegrationValue = (id: IntegrationId, value: string) =>
  integrations.find((item) => item.id === id)?.pattern.test(value) ?? false;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockPattern = (id: IntegrationId) =>
  new RegExp(
    `<!-- bdflow:${escapeRegExp(id)}:([^\\s>]*) -->[\\s\\S]*?<!-- /bdflow:${escapeRegExp(id)} -->\\n?`,
    "g"
  );

/** Read the value of an integration from the custom code, if it is set. */
export const getIntegrationValue = (
  code: string,
  id: IntegrationId
): string => {
  const match = new RegExp(blockPattern(id).source).exec(code);
  return match?.[1] ?? "";
};

/**
 * Set or clear an integration in the custom code. Any text outside the
 * integration's own block is left untouched. Invalid values clear the block.
 */
export const setIntegrationValue = (
  code: string,
  id: IntegrationId,
  value: string
): string => {
  const definition = integrations.find((item) => item.id === id);
  const withoutBlock = code.replace(blockPattern(id), "").trimEnd();
  const trimmed = value.trim();
  if (definition === undefined || definition.pattern.test(trimmed) === false) {
    return withoutBlock;
  }
  const block = `<!-- bdflow:${id}:${trimmed} -->\n${definition.render(trimmed)}\n<!-- /bdflow:${id} -->`;
  return withoutBlock === "" ? block : `${withoutBlock}\n${block}`;
};
