import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { allowedDestinations } from "~/services/destinations.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { formSubmissionLimits } from "~/services/form-submissions.server";

type UntypedClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => {
          limit: (count: number) => PromiseLike<{
            data: Array<{
              id: string;
              formName: string;
              data: Record<string, string>;
              createdAt: string;
            }> | null;
            error: unknown;
          }>;
        };
      };
    };
  };
};

// Lists the latest submissions of a site for people who can edit it.
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["empty"]);
  await checkCsrf(request);
  const projectId = params.projectId;
  if (projectId === undefined) {
    throw new Response("Project id undefined", { status: 400 });
  }
  const context = await createContext(request);
  const allowed = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (allowed === false) {
    throw new Response("Forbidden", { status: 403 });
  }
  const result = await (context.postgrest.client as unknown as UntypedClient)
    .from("FormSubmission")
    .select("id, formName, data, createdAt")
    .eq("projectId", projectId)
    .order("createdAt", { ascending: false })
    .limit(formSubmissionLimits.listLimit);
  if (result.error) {
    throw new Response("Could not load submissions", { status: 500 });
  }
  return json(
    { submissions: result.data ?? [] },
    { headers: privateNoStoreResponseHeaders }
  );
};
