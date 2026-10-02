export const formSubmissionLimits = {
  fields: 100,
  valueLength: 10_000,
  keyLength: 100,
  bodyBytes: 200_000,
  formNameLength: 100,
  listLimit: 200,
} as const;

/** A hidden field bots fill in. Submissions that set it are dropped. */
export const honeypotFieldName = "_bdflow_hp";
const formNameField = "_form";

export type ParsedSubmission =
  | { status: "ok"; formName: string; data: Record<string, string> }
  | { status: "spam" }
  | { status: "invalid"; message: string };

/**
 * Turn a posted body into a plain record of text fields. Names starting with
 * an underscore are reserved for the platform and are not stored.
 */
export const parseSubmissionFields = (
  entries: Iterable<[string, unknown]>
): ParsedSubmission => {
  const data: Record<string, string> = {};
  let formName = "";
  let count = 0;
  for (const [key, value] of entries) {
    if (key === honeypotFieldName) {
      if (typeof value === "string" && value.trim() !== "") {
        return { status: "spam" };
      }
      continue;
    }
    if (key === formNameField) {
      if (typeof value === "string") {
        formName = value.slice(0, formSubmissionLimits.formNameLength);
      }
      continue;
    }
    if (key.startsWith("_")) {
      continue;
    }
    if (typeof value !== "string") {
      // uploaded files are not supported
      continue;
    }
    if (key.length === 0 || key.length > formSubmissionLimits.keyLength) {
      return { status: "invalid", message: "Invalid field name" };
    }
    if (value.length > formSubmissionLimits.valueLength) {
      return { status: "invalid", message: `Field "${key}" is too long` };
    }
    count += 1;
    if (count > formSubmissionLimits.fields) {
      return { status: "invalid", message: "Too many fields" };
    }
    // repeated names (checkbox groups) are joined
    data[key] = Object.hasOwn(data, key) ? `${data[key]}, ${value}` : value;
  }
  if (count === 0) {
    return { status: "invalid", message: "The form is empty" };
  }
  return { status: "ok", formName, data };
};

/**
 * The public host of the app. Project editors live on a host with a
 * `p-<id>` label (`p-<id>-dot-host` or `p-<id>.host`), which is removed.
 */
export const getAppOriginFromBuilderHost = (host: string) =>
  host.replace(/^p-[0-9a-f-]+-dot-/i, "").replace(/^p-[0-9a-f-]+\./i, "");
