import { describe, expect, test } from "vitest";
import { createS3ObjectUrl } from "./object-url";

describe("createS3ObjectUrl", () => {
  test("encodes a flat asset key including separators", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example",
        bucket: "assets",
        key: "folder/project one",
      }).pathname
    ).toBe("/assets/folder%2Fproject%20one");
  });

  test("keeps the endpoint path prefix (Supabase-style endpoints)", () => {
    const url = createS3ObjectUrl({
      endpoint: "https://abc.supabase.co/storage/v1/s3",
      bucket: "assets",
      key: "file.png",
    });
    expect(url.href).toBe(
      "https://abc.supabase.co/storage/v1/s3/assets/file.png"
    );
  });

  test("does not double slashes when the endpoint ends with one", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://abc.supabase.co/storage/v1/s3/",
        bucket: "assets",
        key: "file.png",
      }).pathname
    ).toBe("/storage/v1/s3/assets/file.png");
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example/",
        bucket: "assets",
        key: "file.png",
      }).pathname
    ).toBe("/assets/file.png");
  });

  test("encodes keys with special characters under a prefix", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://abc.supabase.co/storage/v1/s3",
        bucket: "assets",
        key: "a b/c?d#e.png",
      }).href
    ).toBe(
      "https://abc.supabase.co/storage/v1/s3/assets/a%20b%2Fc%3Fd%23e.png"
    );
  });

  test("ignores a query string or hash on the endpoint", () => {
    expect(
      createS3ObjectUrl({
        endpoint: "https://storage.example/s3?x=1#frag",
        bucket: "assets",
        key: "file.png",
      }).href
    ).toBe("https://storage.example/s3/assets/file.png");
  });
});
