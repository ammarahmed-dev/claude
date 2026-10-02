-- Submissions posted by forms on published sites.
CREATE TABLE "FormSubmission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" text NOT NULL,
  "formName" text NOT NULL DEFAULT '',
  "data" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "FormSubmission_projectId_createdAt_idx"
  ON "FormSubmission" ("projectId", "createdAt" DESC);
ALTER TABLE "FormSubmission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "FormSubmission" FROM anon, authenticated;
GRANT ALL ON "FormSubmission" TO service_role;
