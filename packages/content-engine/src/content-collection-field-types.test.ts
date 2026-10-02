import { describe, expect, test } from "vitest";
import {
  collectionSelectOptionLimit,
  createDefaultCollectionConfig,
  parseCollectionConfig,
  serializeCollectionConfig,
} from "./content-collection";

const createConfig = (properties: Record<string, unknown>) => {
  const schema = JSON.parse(createDefaultCollectionConfig());
  Object.assign(schema.properties, properties);
  return JSON.stringify(schema);
};

describe("select field", () => {
  const source = createConfig({
    category: { type: "string", enum: ["news", "guide", "release"] },
  });

  test("is parsed as a select control with options", () => {
    const field = parseCollectionConfig(source).fields.find(
      (item) => item.key === "category"
    );
    expect(field).toMatchObject({
      type: "string",
      control: "select",
      options: ["news", "guide", "release"],
    });
  });

  test("only accepts listed options", () => {
    const config = parseCollectionConfig(source);
    const base = { title: "Post", slug: "post" };
    expect(config.validate({ ...base, category: "news" }).success).toBe(true);
    expect(config.validate({ ...base, category: "other" }).success).toBe(false);
    expect(config.validate({ ...base, category: 1 }).success).toBe(false);
  });

  test("round-trips through serialization", () => {
    const config = parseCollectionConfig(source);
    const saved = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(saved.properties.category.enum).toEqual([
      "news",
      "guide",
      "release",
    ]);
    const reparsed = parseCollectionConfig(JSON.stringify(saved));
    expect(
      reparsed.fields.find((item) => item.key === "category")?.options
    ).toEqual(["news", "guide", "release"]);
  });

  test.each([
    ["empty list", []],
    ["duplicates", ["a", "a"]],
    ["blank option", ["a", " "]],
    ["non-string option", ["a", 1]],
    ["not an array", "a"],
    [
      "too many options",
      Array.from(
        { length: collectionSelectOptionLimit + 1 },
        (_, i) => `o${i}`
      ),
    ],
  ])("rejects invalid enum: %s", (_name, options) => {
    expect(() =>
      parseCollectionConfig(
        createConfig({ category: { type: "string", enum: options } })
      )
    ).toThrow("enum must list");
  });

  test("select control requires an enum", () => {
    expect(() =>
      parseCollectionConfig(
        createConfig({
          category: { type: "string", "x-webstudio": { control: "select" } },
        })
      )
    ).toThrow("requires an enum");
  });

  test("supports more options than a typical CMS dropdown", () => {
    const options = Array.from({ length: 200 }, (_, i) => `option-${i}`);
    const config = parseCollectionConfig(
      createConfig({ category: { type: "string", enum: options } })
    );
    expect(
      config.fields.find((item) => item.key === "category")?.options
    ).toHaveLength(200);
  });
});

describe("date field", () => {
  const source = createConfig({
    publishedOn: { type: "string", format: "date" },
  });

  test("is parsed as a date control", () => {
    const field = parseCollectionConfig(source).fields.find(
      (item) => item.key === "publishedOn"
    );
    expect(field).toMatchObject({ type: "string", control: "date" });
  });

  test.each([
    ["2026-10-01", true],
    ["2024-02-29", true],
    ["2026-02-29", false],
    ["2026-13-01", false],
    ["2026-1-1", false],
    ["October 1", false],
    ["", false],
  ])("validates %s -> %s", (value, valid) => {
    const config = parseCollectionConfig(source);
    expect(
      config.validate({ title: "Post", slug: "post", publishedOn: value })
        .success
    ).toBe(valid);
  });

  test("round-trips through serialization", () => {
    const config = parseCollectionConfig(source);
    const saved = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(saved.properties.publishedOn.format).toBe("date");
    expect(saved.properties.publishedOn["x-webstudio"].control).toBe("date");
  });

  test("rejects unsupported formats", () => {
    expect(() =>
      parseCollectionConfig(
        createConfig({ when: { type: "string", format: "date-time" } })
      )
    ).toThrow("format must be one of date");
  });

  test("date control requires the date format", () => {
    expect(() =>
      parseCollectionConfig(
        createConfig({
          when: { type: "string", "x-webstudio": { control: "date" } },
        })
      )
    ).toThrow("requires format");
  });
});

describe.each([
  {
    control: "email",
    format: "email",
    good: "hello@example.com",
    bad: ["hello", "a@b", "a b@c.com"],
  },
  {
    control: "link",
    format: "uri",
    good: "https://example.com/page",
    bad: ["example.com", "/relative", ""],
  },
  {
    control: "color",
    format: "color",
    good: "#2457d6",
    bad: ["2457d6", "#fff", "blue"],
  },
])("$control field", ({ control, format, good, bad }) => {
  const source = createConfig({
    value: {
      type: "string",
      format,
      "x-webstudio": { control },
    },
  });

  test("is parsed with its control", () => {
    const field = parseCollectionConfig(source).fields.find(
      (item) => item.key === "value"
    );
    expect(field).toMatchObject({ type: "string", control });
  });

  test("accepts a valid value and rejects invalid ones", () => {
    const config = parseCollectionConfig(source);
    const base = { title: "Post", slug: "post" };
    expect(config.validate({ ...base, value: good }).success).toBe(true);
    for (const value of bad) {
      expect(config.validate({ ...base, value }).success).toBe(false);
    }
  });

  test("round-trips through serialization", () => {
    const config = parseCollectionConfig(source);
    const saved = JSON.parse(
      serializeCollectionConfig({ config, fields: config.fields })
    );
    expect(saved.properties.value.format).toBe(format);
    expect(saved.properties.value["x-webstudio"].control).toBe(control);
  });

  test("requires the matching format", () => {
    const wrong = createConfig({
      value: { type: "string", "x-webstudio": { control } },
    });
    expect(() => parseCollectionConfig(wrong)).toThrow();
  });
});
