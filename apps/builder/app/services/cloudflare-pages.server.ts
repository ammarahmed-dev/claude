import env from "~/env/env.server";

/**
 * Published sites are Cloudflare Pages projects named after the site address,
 * served at <site>.pages.dev. Custom domains (www.example.com) are attached to
 * the same project and only need a CNAME to <site>.pages.dev at any DNS host.
 */

type CloudflareResponse<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
};

export type PagesDomain = {
  name: string;
  status: string;
  verification_data?: { status?: string; error_message?: string };
  validation_data?: { status?: string; error_message?: string };
};

export const isCloudflarePagesConfigured = () =>
  (env.CLOUDFLARE_API_TOKEN ?? "") !== "" &&
  (env.CLOUDFLARE_ACCOUNT_ID ?? "") !== "";

const request = async <T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
) => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects${path}`,
    {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }
  );
  const data = (await response.json().catch(() => undefined)) as
    | CloudflareResponse<T>
    | undefined;
  return { status: response.status, data };
};

const errorMessage = (data: CloudflareResponse<unknown> | undefined) =>
  data?.errors?.map((error) => error.message).join("; ") ||
  "Cloudflare did not accept the request";

/** Cloudflare Pages project names: lowercase letters, digits and dashes. */
export const getPagesProjectName = (siteDomain: string) =>
  siteDomain
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 58);

export const ensurePagesProject = async (projectName: string) => {
  const existing = await request(`/${projectName}`);
  if (existing.status === 200) {
    return;
  }
  const created = await request("", {
    method: "POST",
    body: { name: projectName, production_branch: "main" },
  });
  if (created.data?.success !== true) {
    throw new Error(errorMessage(created.data));
  }
};

export const addPagesDomain = async (projectName: string, domain: string) => {
  await ensurePagesProject(projectName);
  const result = await request<PagesDomain>(`/${projectName}/domains`, {
    method: "POST",
    body: { name: domain },
  });
  if (result.data?.success === true) {
    return;
  }
  // adding a domain twice is fine
  const existing = await getPagesDomain(projectName, domain);
  if (existing === undefined) {
    throw new Error(errorMessage(result.data));
  }
};

export const getPagesDomain = async (projectName: string, domain: string) => {
  const result = await request<PagesDomain>(
    `/${projectName}/domains/${encodeURIComponent(domain)}`
  );
  return result.data?.success === true ? result.data.result : undefined;
};

/** Asks Cloudflare to check the DNS records again. */
export const retryPagesDomain = async (projectName: string, domain: string) => {
  await request(`/${projectName}/domains/${encodeURIComponent(domain)}`, {
    method: "PATCH",
  });
};

export const removePagesDomain = async (
  projectName: string,
  domain: string
) => {
  const result = await request(
    `/${projectName}/domains/${encodeURIComponent(domain)}`,
    { method: "DELETE" }
  );
  if (result.status !== 200 && result.status !== 404) {
    throw new Error(errorMessage(result.data));
  }
};

/** Maps a Cloudflare Pages domain to the editor's active/pending/error. */
export const toDomainStatus = (
  domain: PagesDomain | undefined
): { status: "active" | "pending" } | { status: "error"; error: string } => {
  if (domain === undefined) {
    return { status: "pending" };
  }
  if (domain.status === "active") {
    return { status: "active" };
  }
  if (domain.status === "error" || domain.status === "blocked") {
    return {
      status: "error",
      error:
        domain.validation_data?.error_message ??
        domain.verification_data?.error_message ??
        "Cloudflare could not connect this domain. Check the CNAME record.",
    };
  }
  return { status: "pending" };
};
