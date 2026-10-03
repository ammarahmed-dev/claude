import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";

type DeploymentTrpc = AppContext["deployment"]["deploymentTrpc"];
type PublishInput = Parameters<DeploymentTrpc["publish"]["mutate"]>[0];
type PublishOutput = Awaited<ReturnType<DeploymentTrpc["publish"]["mutate"]>>;

/**
 * Cloudflare Worker names allow lowercase letters, digits and dashes and
 * must start with a letter or digit.
 */
export const getWorkerName = (siteDomain: string) =>
  siteDomain
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

export const isBdflowPublishingConfigured = () =>
  env.CLOUDFLARE_API_TOKEN !== undefined &&
  env.CLOUDFLARE_API_TOKEN !== "" &&
  env.CLOUDFLARE_ACCOUNT_ID !== undefined &&
  env.CLOUDFLARE_ACCOUNT_ID !== "" &&
  env.TRPC_SERVER_API_TOKEN !== undefined &&
  env.TRPC_SERVER_API_TOKEN !== "";

const SANDBOX_TIMEOUT = 15 * 60 * 1000;

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
  const repoDir = new URL(env.BDFLOW_PUBLISH_REPO).pathname
    .split("/")
    .pop()
    ?.replace(/\.git$/, "");
  await sandbox.runCommand({
    cmd: "bash",
    args: [`/vercel/${repoDir}/scripts/bdflow-publish.sh`],
    cwd: `/vercel/${repoDir}`,
    detached: true,
    env: {
      BUILD_ID: input.buildId,
      BUILDER_ORIGIN: input.builderOrigin,
      SERVICE_TOKEN: env.TRPC_SERVER_API_TOKEN ?? "",
      WORKER_NAME: getWorkerName(siteDomain),
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ?? "",
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ?? "",
    },
  });
  console.info(
    `Publishing build ${input.buildId} to ${siteDomain} in sandbox ${sandbox.name}`
  );
  return { success: true };
};

/**
 * Replaces the hosted publishing service: Publish builds the site in a Vercel
 * Sandbox and deploys it to Cloudflare Workers.
 */
export const createBdflowDeploymentTrpc = (
  fallback: DeploymentTrpc,
  getSiteDomain: (buildId: string) => Promise<string | undefined>
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
          return {
            success: false,
            error:
              error instanceof Error
                ? `Publish failed to start: ${error.message}`
                : "Publish failed to start",
          };
        }
      },
    },
    unpublish: fallback.unpublish,
  }) as unknown as DeploymentTrpc;
