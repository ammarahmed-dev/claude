import { describe, expect, test } from "vitest";
import {
  computeOffsets,
  getPartRange,
  remapKeyframes,
  splitText,
} from "./animation-parts";

describe("getPartRange", () => {
  test("one part at a time covers the timeline in equal steps", () => {
    expect([0, 1, 2].map((i) => getPartRange(i, 3, 1))).toEqual([
      [0, 1 / 3],
      [1 / 3, 2 / 3],
      [2 / 3, 1],
    ]);
  });
  test("a wider window overlaps parts and still ends at 1", () => {
    const ranges = [0, 1, 2, 3].map((i) => getPartRange(i, 4, 2));
    expect(ranges[0]).toEqual([0, 0.4]);
    expect(ranges[3][1]).toBe(1);
    expect(ranges[1][0]).toBeLessThan(ranges[0][1]);
  });
  test("window 0 is a typewriter and a single part takes the whole timeline", () => {
    const [start, end] = getPartRange(1, 4, 0);
    expect(start).toBe(0.25);
    expect(end - start).toBeLessThan(0.001);
    expect(getPartRange(0, 1, 3)).toEqual([0, 1]);
  });
});

test("missing offsets are spaced evenly", () => {
  expect(computeOffsets([{}, {}, {}])).toEqual([0, 0.5, 1]);
  expect(computeOffsets([{ offset: 0 }, {}, {}, { offset: 0.9 }])).toEqual([
    0, 0.3, 0.6, 0.9,
  ]);
  expect(computeOffsets([{ opacity: 0 }])).toEqual([1]);
});

test("keyframes are squeezed into a part's range and hold their ends", () => {
  expect(
    remapKeyframes(
      [
        { offset: 0, opacity: 0 },
        { offset: 1, opacity: 1 },
      ],
      0.5,
      0.75,
      "ease"
    )
  ).toEqual([
    { offset: 0, opacity: 0 },
    { offset: 0.5, opacity: 0, easing: "ease" },
    { offset: 0.75, opacity: 1, easing: "ease" },
    { offset: 1, opacity: 1 },
  ]);
  const same = [{ opacity: 0 }];
  expect(remapKeyframes(same, 0, 1)).toBe(same);
});

describe("splitText", () => {
  test("by character keeps words apart", () => {
    expect(splitText("Hi yo", "char")).toEqual([
      { type: "part", value: "H", word: 0 },
      { type: "part", value: "i", word: 0 },
      { type: "space", value: " " },
      { type: "part", value: "y", word: 1 },
      { type: "part", value: "o", word: 1 },
    ]);
  });
  test("by word", () => {
    expect(splitText("Build  fast", "space").map((p) => p.value)).toEqual([
      "Build",
      "  ",
      "fast",
    ]);
  });
  test("by symbol removes the symbol", () => {
    expect(
      splitText("Design#Build#Ship", 'symbol "#"').map((p) => p.value)
    ).toEqual(["Design", "Build", "Ship"]);
  });
});
