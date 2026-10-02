-- Cloned projects take an id from the pre-registered pool when one is free.
CREATE OR REPLACE FUNCTION public.clone_project(project_id text, user_id text, title text, domain text)
 RETURNS "Project"
 LANGUAGE plpgsql
AS $function$
DECLARE
  old_project "Project";
  new_project "Project";
BEGIN
  SELECT * FROM "Project" WHERE id = project_id INTO old_project;

  INSERT INTO "Project" (id, "userId", title, domain)
  VALUES (COALESCE(claim_project_id(), gen_random_uuid()::text), user_id, title, domain)
  RETURNING * INTO new_project;

  INSERT INTO "AssetFolder" (id, "projectId", name, "parentId", "createdAt")
  SELECT id, new_project.id, name, "parentId", "createdAt"
  FROM "AssetFolder"
  WHERE "projectId" = old_project.id;

  INSERT INTO "Asset" (
    id,
    name,
    "projectId",
    filename,
    description,
    "folderId"
  )
  SELECT
    asset.id,
    asset.name,
    new_project.id,
    asset.filename,
    asset.description,
    asset."folderId"
  FROM "Asset" AS asset, "File" AS file
  WHERE
    asset.name = file.name AND
    file.status = 'UPLOADED' AND
    asset."projectId" = old_project.id;

  UPDATE "Project"
  SET "previewImageAssetId" = old_project."previewImageAssetId"
  WHERE id = new_project.id;

  INSERT INTO "Build" (
    id,
    "projectId",
    pages,
    "styleSources",
    "styleSourceSelections",
    styles,
    breakpoints,
    props,
    instances,
    "dataSources",
    resources,
    "marketplaceProduct",
    "projectSettings"
  )
  SELECT
    gen_random_uuid(),
    new_project.id,
    pages,
    "styleSources",
    "styleSourceSelections",
    styles,
    breakpoints,
    props,
    instances,
    "dataSources",
    resources,
    "marketplaceProduct",
    "projectSettings"
  FROM "Build"
  WHERE "projectId" = old_project.id AND deployment IS NULL;

  RETURN new_project;
END;
$function$
;
