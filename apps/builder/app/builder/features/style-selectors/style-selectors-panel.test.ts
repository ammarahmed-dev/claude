import { expect, test } from "vitest";
import type { StyleSource } from "@webstudio-is/sdk";
import { getTokenRows } from "./style-selectors-panel";

test("lists classes by name with element and style counts", () => {
  const sources: StyleSource[] = [
    { type: "token", id: "b", name: "card 10" },
    { type: "local", id: "local" },
    { type: "token", id: "a", name: "card 2" },
    { type: "token", id: "c", name: "Button" },
  ];
  const usages = new Map([
    ["a", new Set(["i1", "i2"])],
    ["c", new Set(["i3"])],
  ]);
  const styles = [
    { styleSourceId: "a" },
    { styleSourceId: "a" },
    { styleSourceId: "b" },
    { styleSourceId: "local" },
  ];
  expect(
    getTokenRows(sources, usages, styles).map((row) => [
      row.token.name,
      row.usages,
      row.declarations,
    ])
  ).toEqual([
    ["Button", 1, 0],
    ["card 2", 2, 2],
    ["card 10", 0, 1],
  ]);
});
