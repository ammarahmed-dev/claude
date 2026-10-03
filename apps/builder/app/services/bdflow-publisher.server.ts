import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import {
  addPagesDomain,
  getPagesDomain,
  getPagesProjectName,
  isCloudflarePagesConfigured,
  removePagesDomain,
  retryPagesDomain,
  toDomainStatus,
} from "./cloudflare-pages.server";

type DeploymentTrpc = AppContext["deployment"]["deploymentTrpc"];
type DomainTrpc = AppContext["domain"]["domainTrpc"];
type PublishInput = Parameters<DeploymentTrpc["publish"]["mutate"]>[0];
type PublishOutput = Awaited<ReturnType<DeploymentTrpc["publish"]["mutate"]>>;

export const isBdflowPublishingConfigured = () =>
  isCloudflarePagesConfigured() &&
  env.TRPC_SERVER_API_TOKEN !== undefined &&
  env.TRPC_SERVER_API_TOKEN !== "";

const SANDBOX_TIMEOUT = 15 * 60 * 1000;

// The sandbox clones the repository into its working directory; find the
// script wherever that is instead of assuming a folder name.
const runPublishScript = [
  'for dir in "$PWD" "$PWD"/* /vercel/sandbox /vercel/*; do',
  '  if [ -f "$dir/scripts/bdflow-publish.sh" ]; then',
  '    exec bash "$dir/scripts/bdflow-publish.sh"',
  "  fi",
  "done",
  'echo "publish script not found"; exit 1',
].join("\n");

/**
 * Starts the build of one published site in a Vercel Sandbox. The sandbox
 * clones this repository, runs scripts/bdflow-publish.sh and reports the
 * result to /rest/publish-status; this call returns as soon as it started.
 */
const startPublish = async (
  input: PublishInput,
  siteDomain: string
): Promise<PublishOutput> => {
  const { Sandbox } = await import("@vercel/sandbox");
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: env.BDFLOW_PUBLISH_REPO,
      revision: env.BDFLOW_PUBLISH_REF,
      depth: 1,
    },
    resources: { vcpus: 4 },
    timeout: SANDBOX_TIMEOUT,
    runtime: "node22",
    persistent: false,
    tags: { purpose: "publish", build: input.buildId.slice(0, 64) },
  });
  await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", runPublishScript],
    detached: true,
    env: {
      BUILD_ID: input.buildId,
      BUILDER_ORIGIN: input.builderOrigin,
      SERVICE_TOKEN: env.TRPC_SERVER_API_TOKEN ?? "",
      SITE_NAME: getPagesProjectName(siteDomain),
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ?? "",
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ?? "",
    },
  });
  console.info(
    `Publishing build ${input.buildId} to ${siteDomain} in sandbox ${sandbox.name}`
  );
  return { success: true };
};

const failure = (prefix: string, error: unknown) => ({
  success: false as const,
  error: error instanceof Error ? `${prefix}: ${error.message}` : prefix,
});

/**
 * Replaces the hosted publishing service: Publish builds the site in a Vercel
 * Sandbox and deploys it to Cloudflare Pages.
 */
export const createBdflowDeploymentTrpc = (
  fallback: DeploymentTrpc,
  getSiteDomain: (buildId: string) => Promise<string | undefined>,
  getSiteDomainOfCustomDomain: (domain: string) => Promise<string | undefined>
): DeploymentTrpc =>
  ({
    publish: {
      mutate: async (input: PublishInput): Promise<PublishOutput> => {
        if (input.destination === "static") {
          return fallback.publish.mutate(input);
        }
        try {
          const siteDomain = await getSiteDomain(input.buildId);
          if (siteDomain === undefined) {
            return { success: false, error: "Site address is missing" };
          }
          return await startPublish(input, siteDomain);
        } catch (error) {
          console.error("Publish failed to start", error);
          return failure("Publish failed to start", error);
        }
      },
    },
    unpublish: {
      mutate: async ({ domain }: { domain: string }) => {
        const siteDomain = await getSiteDomainOfCustomDomain(domain);
        if (siteDomain === undefined) {
          return { success: false, error: "NOT_IMPLEMENTED" };
        }
        try {
          await removePagesDomain(getPagesProjectName(siteDomain), domain);
          return { success: true };
        } catch (error) {
          return failure("Could not remove the domain", error);
        }
      },
    },
  }) as unknown as DeploymentTrpc;

/**
 * Custom domains: "Check status" in the Publish dialog attaches the domain to
 * the site's Cloudflare Pages project and reads whether its CNAME works.
 */
export const createBdflowDomainTrpc = (
  getSiteDomainOfCustomDomain: (domain: string) => Promise<string | undefined>
): DomainTrpc => {
  const getProjectName = async (domain: string) => {
    const siteDomain = await getSiteDomainOfCustomDomain(domain);
    if (siteDomain === undefined) {
      throw new Error(`${domain} is not added to a site`);
    }
    return getPagesProjectName(siteDomain);
  };
  return {
    create: {
      mutate: async ({ domain }: { domain: string; txtRecord: string }) => {
        try {
          await addPagesDomain(await getProjectName(domain), domain);
          return { success: true, data: undefined };
        } catch (error) {
          return failure("Could not add the domain", error);
        }
      },
    },
    refresh: {
      mutate: async ({ domain }: { domain: string }) => {
        try {
          await retryPagesDomain(await getProjectName(domain), domain);
          return { success: true, data: undefined };
        } catch (error) {
          return failure("Could not check the domain", error);
        }
      },
    },
    getStatus: {
      query: async ({ domain }: { domain: string }) => {
        try {
          const projectName = await getProjectName(domain);
          let pagesDomain = await getPagesDomain(projectName, domain);
          if (pagesDomain === undefined) {
            await addPagesDomain(projectName, domain);
            pagesDomain = await getPagesDomain(projectName, domain);
          } else if (pagesDomain.status !== "active") {
            await retryPagesDomain(projectName, domain);
          }
          return { success: true, data: toDomainStatus(pagesDomain) };
        } catch (error) {
          return failure("Could not check the domain", error);
        }
      },
    },
  } as unknown as DomainTrpc;
};
