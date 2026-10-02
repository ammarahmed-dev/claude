import { expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { getSharedComponents } from "./components-library-panel";

const slot = (id: string, fragment: string, label?: string): Instance => ({
  type: "instance",
  id,
  component: "Slot",
  label,
  children: [{ type: "id", value: fragment }],
});

test("groups slots that share content into one component", () => {
  const components = getSharedComponents([
    slot("s1", "header-fragment"),
    slot("s2", "header-fragment", "Header"),
    slot("s3", "footer-fragment", "Footer"),
    { type: "instance", id: "box", component: "Box", children: [] },
  ]);
  expect(components).toEqual([
    { fragmentId: "footer-fragment", name: "Footer", slotIds: ["s3"] },
    { fragmentId: "header-fragment", name: "Header", slotIds: ["s1", "s2"] },
  ]);
});
