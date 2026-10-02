import { describe, expect, test } from "vitest";
import {
  formSubmissionLimits,
  getAppOriginFromBuilderHost,
  parseSubmissionFields,
} from "./form-submissions.server";

describe("parseSubmissionFields", () => {
  test("keeps text fields and the form name", () => {
    expect(
      parseSubmissionFields([
        ["_form", "Contact"],
        ["name", "Ada"],
        ["email", "ada@example.com"],
      ])
    ).toEqual({
      status: "ok",
      formName: "Contact",
      data: { name: "Ada", email: "ada@example.com" },
    });
  });

  test("joins repeated names", () => {
    expect(
      parseSubmissionFields([
        ["topic", "a"],
        ["topic", "b"],
      ])
    ).toMatchObject({ data: { topic: "a, b" } });
  });

  test("drops platform fields and files", () => {
    const result = parseSubmissionFields([
      ["_redirect", "/thanks"],
      ["file", new Blob(["x"])],
      ["message", "hi"],
    ]);
    expect(result).toMatchObject({ status: "ok", data: { message: "hi" } });
  });

  test("treats a filled honeypot as spam and an empty one as normal", () => {
    expect(
      parseSubmissionFields([
        ["_bdflow_hp", "gotcha"],
        ["message", "buy now"],
      ])
    ).toEqual({ status: "spam" });
    expect(
      parseSubmissionFields([
        ["_bdflow_hp", ""],
        ["message", "hello"],
      ])
    ).toMatchObject({ status: "ok" });
  });

  test("rejects empty, oversized and too many fields", () => {
    expect(parseSubmissionFields([])).toMatchObject({ status: "invalid" });
    expect(
      parseSubmissionFields([
        ["a", "x".repeat(formSubmissionLimits.valueLength + 1)],
      ])
    ).toMatchObject({ status: "invalid" });
    expect(parseSubmissionFields([["x".repeat(101), "v"]])).toMatchObject({
      status: "invalid",
    });
    const many = Array.from(
      { length: formSubmissionLimits.fields + 1 },
      (_, index): [string, string] => [`f${index}`, "v"]
    );
    expect(parseSubmissionFields(many)).toMatchObject({ status: "invalid" });
  });
});

describe("getAppOriginFromBuilderHost", () => {
  test.each([
    [
      "p-805ab8ff-a21d-4d15-9ee2-5f33364ac8d4-dot-bdflow-studio.vercel.app",
      "bdflow-studio.vercel.app",
    ],
    ["p-805ab8ff-a21d-4d15-9ee2-5f33364ac8d4.example.com", "example.com"],
    ["bdflow-studio.vercel.app", "bdflow-studio.vercel.app"],
  ])("%s", (host, expected) => {
    expect(getAppOriginFromBuilderHost(host)).toBe(expected);
  });
});
