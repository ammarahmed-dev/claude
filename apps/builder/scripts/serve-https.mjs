// Serves the production build (`BUILDER_TARGET=node pnpm build`) over HTTPS.
//
// Project editors insist on https, so a plain `pnpm start` cannot open a project.
// This launcher uses the local certificate shipped in /https (valid for *.wstd.dev,
// which resolves to 127.0.0.1) and works for a local deployment, Docker, or a VPS
// behind its own certificate (set TLS_KEY_FILE / TLS_CERT_FILE).
//
//   BUILDER_TARGET=node pnpm build
//   node scripts/serve-https.mjs            # https://wstd.dev:5174
//
// Environment: SERVE_PORT (default 5174), HOST (default 0.0.0.0), TLS_KEY_FILE, TLS_CERT_FILE,
// and everything in apps/builder/.env (loaded without overriding the real environment).
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import { createRequestHandler } from "@remix-run/express";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // no .env file: rely on the real environment
}

const buildFile = path.join(root, "build/server/index.js");
if (!fs.existsSync(buildFile)) {
  console.error(
    `Missing ${buildFile}. Run: BUILDER_TARGET=node pnpm build (in apps/builder)`
  );
  process.exit(1);
}

const keyFile =
  process.env.TLS_KEY_FILE ?? path.join(root, "../../https/privkey.pem");
const certFile =
  process.env.TLS_CERT_FILE ?? path.join(root, "../../https/fullchain.pem");
const port = Number(process.env.SERVE_PORT ?? 5174);
const host = process.env.HOST ?? "0.0.0.0";

const build = await import(pathToFileURL(buildFile).href);

const app = express();
app.disable("x-powered-by");
app.use(
  "/assets",
  express.static(path.join(root, "build/client/assets"), {
    immutable: true,
    maxAge: "1y",
  })
);
app.use(express.static(path.join(root, "build/client"), { maxAge: "1h" }));
app.use(express.static(path.join(root, "public"), { maxAge: "1h" }));
app.all("*", createRequestHandler({ build, mode: "production" }));

https
  .createServer(
    { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) },
    app
  )
  .listen(port, host, () => {
    console.log(
      `Builder (production build) listening on https://${host}:${port}`
    );
    console.log(
      `Open https://wstd.dev:${port}/ (wstd.dev resolves to 127.0.0.1)`
    );
  });
