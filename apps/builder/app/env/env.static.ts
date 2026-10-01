/**
 * Public Build-time Environment Variables
 *
 * These variables are injected into your bundle at build time based on the environment settings.
 * - Configuration: See envPrefix in [vite.config.ts](../../vite.config.ts)  (GITHUB_)
 * - CI: GitHub Actions runs `vercel build` locally, so each variable used here must be
 *   exported in .github/actions/vercel/action.yaml
 *   before the build step.
 * - Documentation: Refer to the [Vite documentation](https://vitejs.dev/guide/env-and-mode)
 * - Type Definitions: See [vite-env.d.ts](./vite-env.d.ts) in this directory
 */

export const publicStaticEnv = {
  VERSION: import.meta.env.GITHUB_SHA ?? "local",
  COLLAB_RELAY_URL: import.meta.env.PUBLIC_COLLAB_RELAY_URL,
  /**
   * "true" puts each project editor one level below the zone
   * (`p-<id>-dot-studio.example.com`) instead of two (`p-<id>.studio.example.com`),
   * so one `*.example.com` certificate, such as Cloudflare's free Universal SSL, covers all projects.
   */
  SINGLE_LEVEL_PROJECT_HOSTS:
    import.meta.env.PUBLIC_SINGLE_LEVEL_PROJECT_HOSTS === "true",
};
