-- Pre-registered project ids for hosts without wildcard subdomains.
CREATE TABLE "ProjectIdPool" (
  "id" uuid PRIMARY KEY,
  "claimedAt" timestamptz
);
ALTER TABLE "ProjectIdPool" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ProjectIdPool" FROM anon, authenticated;

CREATE FUNCTION claim_project_id() RETURNS text
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE "ProjectIdPool" SET "claimedAt" = now()
  WHERE "id" = (
    SELECT "id" FROM "ProjectIdPool" WHERE "claimedAt" IS NULL
    ORDER BY "id" LIMIT 1 FOR UPDATE SKIP LOCKED
  )
  RETURNING "id"::text;
$$;
REVOKE ALL ON FUNCTION claim_project_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_project_id() TO service_role;
GRANT ALL ON "ProjectIdPool" TO service_role;
