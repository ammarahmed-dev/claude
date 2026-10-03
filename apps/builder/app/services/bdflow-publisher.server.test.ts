import { describe, expect, test } from "vitest";
import { getWorkerName } from "./bdflow-publisher.server";

describe("getWorkerName", () => {
  test("keeps a valid site address", () => {
    expect(getWorkerName("new-jy39nj")).toBe("new-jy39nj");
  });

  test("lowercases and replaces characters workers do not allow", () => {
    expect(getWorkerName("A28Zf_Q0 re.je")).toBe("a28zf-q0-re-je");
  });

  test("trims dashes and long names", () => {
    expect(getWorkerName("--site--")).toBe("site");
    expect(getWorkerName("a".repeat(80))).toHaveLength(63);
  });
});
