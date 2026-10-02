import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { createPostgrestContext } from "~/shared/context.server";
import {
  formSubmissionLimits,
  parseSubmissionFields,
} from "~/services/form-submissions.server";

// Forms on published sites post here from another origin. The endpoint stores
// text fields only and never reads or sets cookies.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const loader = ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return reply(405, { ok: false, error: "Use POST" });
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return reply(405, { ok: false, error: "Use POST" });
  }
  const projectId = params.projectId ?? "";
  if (uuidPattern.test(projectId) === false) {
    return reply(404, { ok: false, error: "Unknown site" });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > formSubmissionLimits.bodyBytes) {
    return reply(413, { ok: false, error: "Submission is too large" });
  }

  let entries: Array<[string, unknown]>;
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) {
      const body = await request.json();
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return reply(400, { ok: false, error: "Invalid JSON" });
      }
      entries = Object.entries(body).map(([key, value]) => [
        key,
        typeof value === "string"
          ? value
          : value == null
            ? ""
            : JSON.stringify(value),
      ]);
    } else {
      entries = Array.from((await request.formData()).entries());
    }
  } catch {
    return reply(400, { ok: false, error: "Could not read the submission" });
  }

  const parsed = parseSubmissionFields(entries);
  if (parsed.status === "spam") {
    // pretend it worked so bots do not adapt
    return reply(200, { ok: true });
  }
  if (parsed.status === "invalid") {
    return reply(400, { ok: false, error: parsed.message });
  }

  const { client } = createPostgrestContext();
  const project = await client
    .from("Project")
    .select("id")
    .eq("id", projectId)
    .eq("isDeleted", false)
    .maybeSingle();
  if (project.error || project.data === null) {
    return reply(404, { ok: false, error: "Unknown site" });
  }
  const inserted = await (client as unknown as UntypedClient)
    .from("FormSubmission")
    .insert({
      projectId,
      formName: parsed.formName,
      data: parsed.data,
    });
  if (inserted.error) {
    console.error("Failed to store a form submission", inserted.error);
    return reply(500, { ok: false, error: "Could not save the submission" });
  }
  return reply(200, { ok: true });
};

type UntypedClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};
