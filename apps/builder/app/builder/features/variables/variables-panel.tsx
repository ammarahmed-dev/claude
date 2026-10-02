import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Flex,
  Grid,
  IconButton,
  InputField,
  PanelTitle,
  ScrollArea,
  Separator,
  Text,
  Tooltip,
  css,
  cssVar,
  theme,
  toast,
} from "@webstudio-is/design-system";
import { EllipsesIcon, PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { $styles } from "~/shared/sync/data-stores";
import {
  $cssVariableDefinitionsByVariable,
  $usedCssVariablesInInstances,
  DeleteCssVariableDialog,
  RenameCssVariableDialog,
  deleteCssVariable,
  openDeleteUnusedCssVariablesDialog,
  validateCssVariableName,
} from "~/builder/shared/css-variable-utils";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";

const row = css({
  display: "grid",
  gap: theme.spacing[2],
  padding: `${theme.spacing[4]} ${theme.panel.paddingInline}`,
  borderBottom: `1px solid ${cssVar("--border-default")}`,
});

const swatch = css({
  display: "block",
  marginLeft: theme.spacing[3],
  width: 16,
  height: 16,
  borderRadius: 4,
  flexShrink: 0,
  border: `1px solid ${cssVar("--border-default")}`,
});

export type VariableRow = {
  name: string;
  value: string;
  global: boolean;
  usages: number;
};

/**
 * Variables sorted by name, with the base value of each. A variable can be
 * defined on several elements; the global one (on the root) wins for display.
 */
export const getVariableRows = ({
  definitions,
  styles,
  usages,
}: {
  definitions: Map<string, Set<string>>;
  styles: Iterable<{ property: string; value: StyleValue; state?: string }>;
  usages: Map<string, number>;
}): VariableRow[] => {
  const values = new Map<string, string>();
  for (const style of styles) {
    if (style.property.startsWith("--") && style.state === undefined) {
      if (values.has(style.property) === false) {
        values.set(style.property, toValue(style.value));
      }
    }
  }
  return Array.from(definitions, ([name, instanceIds]) => ({
    name,
    value: values.get(name) ?? "",
    global: instanceIds.has(ROOT_INSTANCE_ID),
    usages: usages.get(name) ?? 0,
  })).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
};

const looksLikeColor = (value: string) =>
  /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i.test(
    value.trim()
  );

/** Variables are defined on the global root, so every page can use them. */
const defineVariable = (name: string, value: string, overwrite: boolean) => {
  try {
    executeRuntimeMutation({
      id: "cssVariables.define",
      input: { vars: { [name]: value }, overwrite },
    });
    return true;
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "The variable could not be saved."
    );
    return false;
  }
};

const ValueInput = ({ item }: { item: VariableRow }) => {
  const [value, setValue] = useState(item.value);
  useEffect(() => setValue(item.value), [item.value]);
  const commit = () => {
    if (value.trim() === "" || value === item.value) {
      setValue(item.value);
      return;
    }
    defineVariable(item.name, value.trim(), true);
  };
  return (
    <InputField
      aria-label={`Value of ${item.name}`}
      value={value}
      prefix={
        looksLikeColor(value) ? (
          <span
            className={swatch()}
            style={{ backgroundColor: value }}
            aria-hidden
          />
        ) : undefined
      }
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
        }
        if (event.key === "Escape") {
          setValue(item.value);
        }
      }}
    />
  );
};

export const VariablesPanel = (_props: { onClose: () => void }) => {
  const definitions = useStore($cssVariableDefinitionsByVariable);
  const styles = useStore($styles);
  const usages = useStore($usedCssVariablesInInstances);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("--");
  const [newValue, setNewValue] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [renaming, setRenaming] = useState<string>();
  const [deleting, setDeleting] = useState<string>();

  const rows = useMemo(
    () => getVariableRows({ definitions, styles: styles.values(), usages }),
    [definitions, styles, usages]
  );
  const visible = rows.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const unused = rows.filter((item) => item.usages === 0).length;

  const add = () => {
    const name = newName.trim().startsWith("--")
      ? newName.trim()
      : `--${newName.trim()}`;
    const error = validateCssVariableName(name);
    if (error) {
      setNameError(error.message);
      return;
    }
    if (newValue.trim() === "") {
      setNameError("Enter a value, for example #2457d6 or 16px.");
      return;
    }
    if (defineVariable(name, newValue.trim(), false)) {
      setAdding(false);
      setNewName("--");
      setNewValue("");
      setNameError(undefined);
    }
  };

  return (
    <>
      <PanelTitle
        suffix={
          <Tooltip content="New variable">
            <IconButton
              aria-label="New variable"
              onClick={() => setAdding((value) => !value)}
            >
              <PlusIcon />
            </IconButton>
          </Tooltip>
        }
      >
        Variables
      </PanelTitle>
      <Separator />
      {adding && (
        <>
          <Grid gap={2} css={{ padding: theme.panel.padding }}>
            <InputField
              aria-label="Variable name"
              placeholder="--brand-color"
              value={newName}
              autoFocus
              onChange={(event) => {
                setNewName(event.target.value);
                setNameError(undefined);
              }}
            />
            <InputField
              aria-label="Variable value"
              placeholder="#2457d6"
              value={newValue}
              onChange={(event) => {
                setNewValue(event.target.value);
                setNameError(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  add();
                }
              }}
            />
            {nameError && <Text color="destructive">{nameError}</Text>}
            <Flex gap={2} justify="end">
              <Button color="neutral" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button onClick={add}>Add variable</Button>
            </Flex>
          </Grid>
          <Separator />
        </>
      )}
      <Grid gap={2} css={{ padding: theme.panel.padding }}>
        <InputField
          aria-label="Search variables"
          placeholder="Search variables"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Flex align="center" justify="between" gap={2}>
          <Text color="subtle">
            {rows.length} {rows.length === 1 ? "variable" : "variables"},{" "}
            {unused} unused
          </Text>
          <Button
            color="neutral"
            disabled={unused === 0}
            onClick={openDeleteUnusedCssVariablesDialog}
          >
            Clean up
          </Button>
        </Flex>
      </Grid>
      <Separator />
      <ScrollArea>
        <Box>
          {visible.length === 0 && (
            <Text color="subtle" css={{ padding: theme.panel.padding }}>
              {rows.length === 0
                ? "No variables yet. Add colors, sizes and fonts here and use them in the Style panel."
                : "No variable matches."}
            </Text>
          )}
          {visible.map((item) => (
            <div key={item.name} className={row()}>
              <Flex align="center" justify="between" gap={2}>
                <Grid css={{ minWidth: 0 }}>
                  <Text truncate variant="labels" userSelect="text">
                    {item.name}
                  </Text>
                  <Text color="subtle" variant="small">
                    {item.global ? "Site-wide" : "On an element"} ·{" "}
                    {item.usages === 0
                      ? "Unused"
                      : `${item.usages} ${item.usages === 1 ? "use" : "uses"}`}
                  </Text>
                </Grid>
                <Flex gap={1}>
                  <Tooltip content="Rename">
                    <IconButton
                      aria-label={`Rename ${item.name}`}
                      onClick={() => setRenaming(item.name)}
                    >
                      <EllipsesIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <IconButton
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setDeleting(item.name)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Tooltip>
                </Flex>
              </Flex>
              {item.global && <ValueInput item={item} />}
            </div>
          ))}
        </Box>
      </ScrollArea>
      <RenameCssVariableDialog
        cssVariable={
          renaming === undefined ? undefined : { property: renaming }
        }
        onClose={() => setRenaming(undefined)}
        onConfirm={() => setRenaming(undefined)}
      />
      <DeleteCssVariableDialog
        cssVariable={
          deleting === undefined ? undefined : { property: deleting }
        }
        onClose={() => setDeleting(undefined)}
        onConfirm={(property) => {
          deleteCssVariable(property);
          setDeleting(undefined);
        }}
      />
    </>
  );
};
