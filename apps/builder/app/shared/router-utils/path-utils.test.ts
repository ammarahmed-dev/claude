import { expect, test } from "vitest";
import {
  builderPath,
  builderUrl,
  restAssetsUploadPath,
  areBuilderDataUrlsEqual,
} from "./path-utils";

test("includes an instance deep link in builder paths", () => {
  expect(
    builderPath({
      pageId: "page-id",
      instanceSelector: ["instance-id", "slot-id", "body-id"],
      mode: "content",
    })
  ).toBe(
    "/?pageId=page-id&instance=instance-id%2Cslot-id%2Cbody-id&mode=content"
  );
});

test("includes an instance deep link in builder urls", () => {
  expect(
    builderUrl({
      projectId: "project-id",
      pageId: "page-id",
      instanceSelector: ["instance-id", "body-id"],
      origin: "https://wstd.dev",
    })
  ).toBe(
    "https://p-project-id.wstd.dev/?pageId=page-id&instance=instance-id%2Cbody-id"
  );
});

test("builds the asset upload item route", () => {
  expect(restAssetsUploadPath({ name: "query", width: 100, height: 200 })).toBe(
    "/rest/assets/uploads/query?width=100&height=200"
  );
});

test("instance navigation preserves Builder data but access changes do not", () => {
  const current = new URL(
    builderPath({
      instanceSelector: ["first", "body"],
      authToken: "share-token",
    }),
    "https://wstd.dev"
  );
  const next = new URL(
    builderPath({
      instanceSelector: ["second", "body"],
      authToken: "share-token",
    }),
    current
  );
  expect(areBuilderDataUrlsEqual(current, next)).toBe(true);
  next.searchParams.set("authToken", "other-token");
  expect(areBuilderDataUrlsEqual(current, next)).toBe(false);
});

const projectUuid = "3ef0df2a-6fb7-4df7-b8b6-3fce398de359";

test("keeps the two-level project host by default", () => {
  expect(
    builderUrl({
      projectId: projectUuid,
      origin: "https://studio.aeocheck.co",
      singleLevelHost: false,
    })
  ).toBe(`https://p-${projectUuid}.studio.aeocheck.co/`);
});

test("puts the project host one level below the zone when asked", () => {
  const url = new URL(
    builderUrl({
      projectId: projectUuid,
      origin: "https://studio.aeocheck.co",
      singleLevelHost: true,
    })
  );
  expect(url.host).toBe(`p-${projectUuid}-dot-studio.aeocheck.co`);
  // one label under the zone, so a single *.aeocheck.co certificate covers it
  expect(url.host.split(".").length).toBe(3);
});

test("one-level project hosts resolve back to the project and the dashboard origin", async () => {
  const { parseBuilderUrl } = await import("@webstudio-is/protocol");
  const url = builderUrl({
    projectId: projectUuid,
    origin: "https://studio.aeocheck.co",
    singleLevelHost: true,
    mode: "design",
  });
  expect(parseBuilderUrl(url)).toEqual({
    projectId: projectUuid,
    sourceOrigin: "https://studio.aeocheck.co",
  });
});

test("builds the project host from a project host origin too", () => {
  // the share dialog passes the current (project) origin
  expect(
    new URL(
      builderUrl({
        projectId: projectUuid,
        origin: `https://p-${projectUuid}-dot-studio.aeocheck.co`,
        singleLevelHost: true,
      })
    ).host
  ).toBe(`p-${projectUuid}-dot-studio.aeocheck.co`);
});
