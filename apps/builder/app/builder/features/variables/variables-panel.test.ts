import { expect, test } from "vitest";
import { getVariableRows } from "./variables-panel";

test("lists variables with their base value, scope and usage", () => {
  const rows = getVariableRows({
    definitions: new Map([
      ["--space-10", new Set([":root"])],
      ["--brand", new Set([":root", "card"])],
      ["--local", new Set(["card"])],
      ["--space-2", new Set([":root"])],
    ]),
    styles: [
      {
        property: "--brand",
        value: { type: "keyword", value: "red" },
        state: ":hover",
      },
      { property: "--brand", value: { type: "unparsed", value: "#2457d6" } },
      { property: "--space-2", value: { type: "unit", value: 2, unit: "px" } },
      { property: "color", value: { type: "keyword", value: "blue" } },
    ],
    usages: new Map([["--brand", 3]]),
  });
  expect(rows).toEqual([
    { name: "--brand", value: "#2457d6", global: true, usages: 3 },
    { name: "--local", value: "", global: false, usages: 0 },
    { name: "--space-2", value: "2px", global: true, usages: 0 },
    { name: "--space-10", value: "", global: true, usages: 0 },
  ]);
});
