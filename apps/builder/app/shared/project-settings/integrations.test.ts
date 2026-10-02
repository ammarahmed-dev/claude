import { describe, expect, test } from "vitest";
import {
  getIntegrationValue,
  integrations,
  isValidIntegrationValue,
  setIntegrationValue,
} from "./integrations";

const samples = {
  ga4: "G-ABC12345",
  gtm: "GTM-ABCD123",
  plausible: "example.com",
  clarity: "abcdefghij",
  metaPixel: "123456789012345",
  googleVerification: "abcDEF123_-xyz",
  bingVerification: "0123456789ABCDEF0123456789ABCDEF",
} as const;

describe("integrations", () => {
  test.each(Object.entries(samples))("%s round-trips", (id, value) => {
    const key = id as keyof typeof samples;
    expect(isValidIntegrationValue(key, value)).toBe(true);
    const code = setIntegrationValue("", key, value);
    expect(code).toContain(value);
    expect(getIntegrationValue(code, key)).toBe(value);
    expect(setIntegrationValue(code, key, "")).toBe("");
  });

  test("covers every defined integration", () => {
    expect(integrations.map((item) => item.id).sort()).toEqual(
      Object.keys(samples).sort()
    );
  });

  test("keeps the user's own code and other integrations", () => {
    const own = '<script src="/mine.js"></script>';
    let code = setIntegrationValue(own, "ga4", samples.ga4);
    code = setIntegrationValue(code, "plausible", samples.plausible);
    expect(code.startsWith(own)).toBe(true);
    expect(getIntegrationValue(code, "ga4")).toBe(samples.ga4);
    expect(getIntegrationValue(code, "plausible")).toBe(samples.plausible);
    code = setIntegrationValue(code, "ga4", "G-NEWID9999");
    expect(getIntegrationValue(code, "ga4")).toBe("G-NEWID9999");
    expect(code.match(/bdflow:ga4:/g)).toHaveLength(1);
    code = setIntegrationValue(code, "ga4", "");
    expect(code).not.toContain("googletagmanager.com/gtag");
    expect(getIntegrationValue(code, "plausible")).toBe(samples.plausible);
    expect(code.startsWith(own)).toBe(true);
  });

  test.each([
    ["ga4", "UA-123"],
    ["gtm", "GTM-"],
    ["plausible", "not a domain"],
    ["metaPixel", "abc"],
    ["bingVerification", "short"],
    ["googleVerification", '"><script>'],
  ] as const)("rejects an invalid %s value and clears the block", (id, bad) => {
    expect(isValidIntegrationValue(id, bad)).toBe(false);
    const code = setIntegrationValue("", id, samples[id]);
    expect(setIntegrationValue(code, id, bad)).toBe("");
  });

  test("never lets a value break out of its markup", () => {
    for (const { id } of integrations) {
      expect(
        setIntegrationValue("", id, '"><img src=x onerror=alert(1)>')
      ).toBe("");
    }
  });
});
