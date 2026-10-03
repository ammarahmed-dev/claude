import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { z } from "zod";
import {
  createPostgrestContext,
  isServiceAuthorization,
} from "~/shared/context.server";

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const statusInput = z.object({
  buildId: z.string().min(1).max(200),
  status: z.enum(["PUBLISHED", "FAILED"]),
});

export const loader = () => reply(405, { ok: false, error: "Use POST" });

// The publish sandbox reports here when a site build finished or failed.
export const action = async ({ request }: ActionFunctionArgs) => {
  if (isServiceAuthorization(request.headers.get("Authorization")) === false) {
    return reply(401, { ok: false, error: "Not allowed" });
  }
  const parsed = statusInput.safeParse(await request.json().catch(() => null));
  if (parsed.success === false) {
    return reply(400, { ok: false, error: "Invalid status" });
  }
  const { client } = createPostgrestContext();
  const result = await client
    .from("Build")
    .update({ publishStatus: parsed.data.status })
    .eq("id", parsed.data.buildId)
    .select("id");
  if (result.error) {
    console.error("Publish status update failed", result.error);
    return reply(500, { ok: false, error: "Could not save the status" });
  }
  if (result.data.length === 0) {
    return reply(404, { ok: false, error: "Build not found" });
  }
  return reply(200, { ok: true });
};
