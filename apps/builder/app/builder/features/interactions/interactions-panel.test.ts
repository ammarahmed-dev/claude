import { describe, expect, test } from "vitest";
import {
  findInteractionComponent,
  getInteractionName,
} from "./interactions-panel";

describe("interaction components", () => {
  const components = [
    "Box",
    "ws:element",
    "@webstudio-is/sdk-components-animation:AnimateChildren",
    "@webstudio-is/sdk-components-animation:AnimateText",
  ];

  test("finds namespaced components by name", () => {
    expect(findInteractionComponent(components, "AnimateChildren")).toBe(
      "@webstudio-is/sdk-components-animation:AnimateChildren"
    );
    expect(findInteractionComponent(components, "VideoAnimation")).toBe(
      undefined
    );
  });

  test("recognizes an instance that is an interaction wrapper", () => {
    expect(
      getInteractionName(
        components,
        "@webstudio-is/sdk-components-animation:AnimateText"
      )
    ).toBe("AnimateText");
    expect(getInteractionName(components, "Box")).toBe(undefined);
  });

  test("does not match a similarly named component from another namespace", () => {
    expect(getInteractionName(components, "other:AnimateChildren")).toBe(
      undefined
    );
  });
});
