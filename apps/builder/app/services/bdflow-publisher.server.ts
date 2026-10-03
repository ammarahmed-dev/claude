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

/** Prepared sandbox publishes fork from; the daily job keeps it current. */
export const publishBaseSandbox = "bdflow-publisher";

// The sandbox holds the repository in its working directory (a fresh clone,
// or an older one from the prepared snapshot that UPDATE_REF brings up to
// date); find it instead of assuming a folder name.
const runPublishScript = [
  'for dir in "$PWD" "$PWD"/* /vercel/sandbox /vercel/*; do',
  '  if [ -f "$dir/scripts/bdflow-publish.sh" ]; then',
  '    cd "$dir"',
  '    if [ -n "${UPDATE_REF:-}" ]; then',
  '      git fetch -q --depth 1 origin "$UPDATE_REF" && git reset -q --hard FETCH_HEAD',
  "    fi",
  "    exec bash scripts/bdflow-publish.sh",
  "  fi",
  "done",
  'echo "publish script not found"; exit 1',
].join("\n");

const sandboxOptions = {
  resources: { vcpus: 4 },
  timeout: SANDBOX_TIMEOUT,
  persistent: false,
} as const;

/**
 * Starts from the prepared base sandbox (tools already installed), then from
 * the snapshot in BDFLOW_PUBLISH_SNAPSHOT, and from a fresh clone otherwise.
 */
const createPublishSandbox = async (tags: Record<string, string>) => {
  const { Sandbox } = await import("@vercel/sandbox");
  // the daily job keeps this sandbox's snapshot current, see maintenance
  try {
    const sandbox = await Sandbox.fork({
      ...sandboxOptions,
      tags,
      sourceSandbox: publishBaseSandbox,
    });
    return { sandbox, fromSnapshot: true };
  } catch (error) {
    console.error("Publish base sandbox is not usable", error);
  }
  const snapshotId = env.BDFLOW_PUBLISH_SNAPSHOT;
  if (snapshotId !== undefined && snapshotId !== "") {
    try {
      const sandbox = await Sandbox.create({
        ...sandboxOptions,
        tags,
        source: { type: "snapshot", snapshotId },
      });
      return { sandbox, fromSnapshot: true };
    } catch (error) {
      console.error("Publish snapshot is not usable, cloning instead", error);
    }
  }
  const sandbox = await Sandbox.create({
    ...sandboxOptions,
    tags,
    runtime: "node22",
    source: {
      type: "git",
      url: env.BDFLOW_PUBLISH_REPO,
      revision: env.BDFLOW_PUBLISH_REF,
      depth: 1,
    },
  });
  return { sandbox, fromSnapshot: false };
};

/** Stops a publish sandbox once its script reported back. */
export const stopPublishSandbox = async (name: string) => {
  const { Sandbox } = await import("@vercel/sandbox");
  const sandbox = await Sandbox.get({ name });
  await sandbox.stop();
};

/**
 * Starts the build of one published site in a Vercel Sandbox. The sandbox
 * clones this repository, runs scripts/bdflow-publish.sh and reports the
 * result to /rest/publish-status; this call returns as soon as it started.
 */
const startPublish = async (
  input: PublishInput,
  siteDomain: string
): Promise<PublishOutput> => {
  const { sandbox, fromSnapshot } = await createPublishSandbox({
    purpose: "publish",
    build: input.buildId.slice(0, 64),
  });
  await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", runPublishScript],
    detached: true,
    env: {
      UPDATE_REF: fromSnapshot ? env.BDFLOW_PUBLISH_REF : "",
      SANDBOX_NAME: sandbox.name,
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
