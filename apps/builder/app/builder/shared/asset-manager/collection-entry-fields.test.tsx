import { act } from "react-dom/test-utils";
import { TooltipProvider } from "@webstudio-is/design-system";
import { afterEach, expect, test, vi } from "vitest";
import {
  createDefaultCollectionConfig,
  parseCollectionConfig,
} from "@webstudio-is/content-engine";
import { CollectionEntryFields } from "./collection-entry-fields";
import { createAssetManagerTestRenderer } from "./test-utils";

const renderer = createAssetManagerTestRenderer();
afterEach(() => renderer.cleanup());

const createConfig = () => {
  const schema = JSON.parse(createDefaultCollectionConfig());
  schema.properties.category = {
    type: "string",
    title: "Category",
    enum: ["news", "guide"],
  };
  schema.properties.publishedOn = {
    type: "string",
    title: "Published on",
    format: "date",
  };
  return parseCollectionConfig(JSON.stringify(schema));
};

const renderFields = (values: Record<string, unknown>, onChange = vi.fn()) =>
  renderer.render(
    <TooltipProvider>
      <CollectionEntryFields
        config={createConfig()}
        values={values}
        onChange={onChange}
        onReset={vi.fn()}
      />
    </TooltipProvider>
  );

test("renders date fields with a native date input", () => {
  const container = renderFields({ publishedOn: "2026-10-01" });
  const input = container.querySelector<HTMLInputElement>(
    "#collection-entry-publishedOn"
  );
  expect(input?.type).toBe("date");
  expect(input?.value).toBe("2026-10-01");
});

test("reports date changes as ISO strings", () => {
  const onChange = vi.fn();
  const container = renderFields({}, onChange);
  const input = container.querySelector<HTMLInputElement>(
    "#collection-entry-publishedOn"
  )!;
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )!.set!;
  act(() => {
    setValue.call(input, "2026-12-25");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ key: "publishedOn" }),
    "2026-12-25"
  );
});

test("renders select fields as a dropdown showing the current option", () => {
  const container = renderFields({ category: "guide" });
  const trigger = container.querySelector<HTMLElement>(
    "#collection-entry-category"
  );
  expect(trigger?.getAttribute("role")).toBe("combobox");
  expect(trigger?.textContent).toContain("guide");
  expect(container.querySelector("input#collection-entry-category")).toBeNull();
});

test("shows the placeholder when a select has no valid value", () => {
  const container = renderFields({ category: "removed-option" });
  const trigger = container.querySelector<HTMLElement>(
    "#collection-entry-category"
  );
  expect(trigger?.textContent).toContain("Select an option");
});
