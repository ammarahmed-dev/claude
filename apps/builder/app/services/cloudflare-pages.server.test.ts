import { describe, expect, test } from "vitest";
import { getPagesProjectName, toDomainStatus } from "./cloudflare-pages.server";

describe("getPagesProjectName", () => {
  test("keeps a valid site address", () => {
    expect(getPagesProjectName("new-jy39nj")).toBe("new-jy39nj");
  });

  test("lowercases and replaces characters Pages does not allow", () => {
    expect(getPagesProjectName("A28Zf_Q0 re.je")).toBe("a28zf-q0-re-je");
  });

  test("trims dashes and long names", () => {
    expect(getPagesProjectName("--site--")).toBe("site");
    expect(getPagesProjectName("a".repeat(80))).toHaveLength(58);
  });
});

describe("toDomainStatus", () => {
  test("maps Cloudflare states to the editor's states", () => {
    expect(toDomainStatus(undefined)).toEqual({ status: "pending" });
    expect(toDomainStatus({ name: "a.com", status: "active" })).toEqual({
      status: "active",
    });
    expect(toDomainStatus({ name: "a.com", status: "initializing" })).toEqual({
      status: "pending",
    });
    expect(
      toDomainStatus({
        name: "a.com",
        status: "error",
        validation_data: { error_message: "CNAME missing" },
      })
    ).toEqual({ status: "error", error: "CNAME missing" });
  });
});
