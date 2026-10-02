import { describe, expect, test } from "vitest";
import {
  getPointerProgress,
  scrollRangeToCss,
  toMilliseconds,
  toTimeTiming,
  toWebKeyframes,
  viewRangeToCss,
} from "./animation-engine";

describe("animation engine conversions", () => {
  test("keyframes become Web Animations keyframes", () => {
    expect(
      toWebKeyframes([
        {
          offset: 0,
          styles: {
            opacity: { type: "unit", value: 0, unit: "number" },
            translate: { type: "unparsed", value: "0 40px" },
          },
        },
        {
          styles: {
            "background-color": { type: "keyword", value: "red" },
            "--my-size": { type: "unit", value: 2, unit: "rem" },
          },
        },
      ])
    ).toEqual([
      { offset: 0, opacity: "0", translate: "0 40px" },
      { backgroundColor: "red", "--my-size": "2rem" },
    ]);
  });

  test("durations convert to milliseconds", () => {
    expect(toMilliseconds({ type: "unit", value: 1.5, unit: "s" })).toBe(1500);
    expect(toMilliseconds({ type: "unit", value: 300, unit: "ms" })).toBe(300);
    expect(toMilliseconds({ type: "var", value: "speed" })).toBe(undefined);
    expect(toMilliseconds(undefined)).toBe(undefined);
  });

  test("time-based timing has sensible defaults", () => {
    expect(toTimeTiming({})).toEqual({
      duration: 600,
      delay: 0,
      easing: "ease",
      fill: "both",
      iterations: 1,
    });
    expect(
      toTimeTiming({
        duration: { type: "unit", value: 2, unit: "s" },
        delay: { type: "unit", value: 100, unit: "ms" },
        easing: "ease-in-out",
        iterations: "infinite",
      })
    ).toMatchObject({
      duration: 2000,
      delay: 100,
      easing: "ease-in-out",
      iterations: Number.POSITIVE_INFINITY,
    });
  });

  test("ranges become CSS range strings", () => {
    expect(
      viewRangeToCss(["entry", { type: "unit", value: 10, unit: "%" }])
    ).toBe("entry 10%");
    expect(
      scrollRangeToCss(["start", { type: "unit", value: 200, unit: "px" }])
    ).toBe("200px");
    expect(
      scrollRangeToCss(["end", { type: "unit", value: 10, unit: "%" }])
    ).toBe("calc(100% - 10%)");
    expect(viewRangeToCss(["cover", { type: "var", value: "start" }])).toBe(
      "cover var(--start)"
    );
  });
});

test("pointer progress maps position across a box to 0..1", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };
  expect(getPointerProgress({ clientX: 200, clientY: 0 }, box, "x")).toBe(0.5);
  expect(getPointerProgress({ clientX: 0, clientY: 0 }, box, "x")).toBe(0);
  expect(getPointerProgress({ clientX: 999, clientY: 0 }, box, "x")).toBe(1);
  expect(getPointerProgress({ clientX: 0, clientY: 75 }, box, "y")).toBe(0.25);
  expect(
    getPointerProgress({ clientX: 5, clientY: 5 }, { ...box, width: 0 }, "x")
  ).toBe(0);
});
