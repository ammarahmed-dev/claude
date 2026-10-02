import { useMemo, useState } from "react";
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
import { EllipsesIcon, PlusIcon } from "@webstudio-is/icons";
import { portalComponent, type Instance } from "@webstudio-is/sdk";
import { $instances } from "~/shared/sync/data-stores";
import { $selectedInstancePath } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { showInstance } from "~/builder/features/command-panel/shared/instance-list";

const row = css({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: theme.spacing[3],
  padding: `${theme.spacing[3]} ${theme.panel.paddingInline}`,
  borderBottom: `1px solid ${cssVar("--border-default")}`,
});

const nameButton = css({
  all: "unset",
  display: "grid",
  gap: 2,
  cursor: "pointer",
  minWidth: 0,
  "&:focus-visible": { outline: `2px solid ${cssVar("--border-focus")}` },
});

export type SharedComponent = {
  fragmentId: string;
  name: string;
  /** Slot instances that show this component, first one is the source. */
  slotIds: string[];
};

/**
 * A component is shared content: every Slot that points at the same fragment
 * shows the same elements, so editing one edits all of them.
 */
export const getSharedComponents = (
  instances: Iterable<Instance>
): SharedComponent[] => {
  const byFragment = new Map<string, SharedComponent>();
  for (const instance of instances) {
    if (instance.component !== portalComponent) {
      continue;
    }
    const child = instance.children[0];
    if (child?.type !== "id") {
      continue;
    }
    const existing = byFragment.get(child.value);
    if (existing) {
      existing.slotIds.push(instance.id);
      if (existing.name === "Component" && instance.label) {
        existing.name = instance.label;
      }
      continue;
    }
    byFragment.set(child.value, {
      fragmentId: child.value,
      name: instance.label?.trim() || "Component",
      slotIds: [instance.id],
    });
  }
  return Array.from(byFragment.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
};

const run = (operation: Parameters<typeof executeRuntimeMutation>[0]) => {
  try {
    return executeRuntimeMutation(operation);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "That did not work. Try again."
    );
  }
};

export const ComponentsLibraryPanel = (_props: { onClose: () => void }) => {
  const instances = useStore($instances);
  const selectedPath = useStore($selectedInstancePath);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string>();
  const [draftName, setDraftName] = useState("");

  const components = useMemo(
    () => getSharedComponents(instances.values()),
    [instances]
  );
  const visible = components.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const selected = selectedPath?.[0];
  const selectedParent = selectedPath?.[1];
  const canCreate =
    selected !== undefined &&
    selectedParent !== undefined &&
    selected.instance.component !== portalComponent;

  const createFromSelection = () => {
    if (selectedPath === undefined || canCreate === false) {
      return;
    }
    const label =
      selected?.instance.label ?? `Component ${components.length + 1}`;
    run({
      id: "slots.extract",
      input: {
        instanceSelector: selectedPath.map((item) => item.instance.id),
        label,
      },
    });
  };

  /** A copy goes right after the selected element, like Webflow. */
  const insertCopy = (component: SharedComponent) => {
    if (selected === undefined || selectedParent === undefined) {
      toast.info("Select an element on the page; the copy goes after it.");
      return;
    }
    const index = selectedParent.instance.children.findIndex(
      (child) => child.type === "id" && child.value === selected.instance.id
    );
    run({
      id: "slots.attach",
      input: {
        sourceSlotId: component.slotIds[0],
        parentInstanceId: selectedParent.instance.id,
        insertIndex: index === -1 ? undefined : index + 1,
        label: component.name,
      },
    });
  };

  const rename = (component: SharedComponent) => {
    const name = draftName.trim();
    setRenaming(undefined);
    if (name === "" || name === component.name) {
      return;
    }
    for (const slotId of component.slotIds) {
      run({
        id: "instances.setLabel",
        input: { instanceId: slotId, label: name },
      });
    }
  };

  return (
    <>
      <PanelTitle>Components</PanelTitle>
      <Separator />
      <Grid gap={2} css={{ padding: theme.panel.padding }}>
        <Text color="subtle">
          A component is a piece you reuse across pages. Change one copy and
          every copy updates. Select an element to make it a component.
        </Text>
        <Button
          prefix={<PlusIcon />}
          disabled={canCreate === false}
          onClick={createFromSelection}
        >
          Create component
        </Button>
        <InputField
          aria-label="Search components"
          placeholder="Search components"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Grid>
      <Separator />
      <ScrollArea>
        <Box>
          {visible.length === 0 && (
            <Text color="subtle" css={{ padding: theme.panel.padding }}>
              {components.length === 0
                ? "No components yet. Select a section, header or card and create a component from it."
                : "No component matches."}
            </Text>
          )}
          {visible.map((component) => (
            <div key={component.fragmentId} className={row()}>
              {renaming === component.fragmentId ? (
                <InputField
                  aria-label="Component name"
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => rename(component)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      rename(component);
                    }
                    if (event.key === "Escape") {
                      setRenaming(undefined);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={nameButton()}
                  onClick={() => showInstance(component.slotIds[0])}
                  title="Select the first copy on the canvas"
                >
                  <Text truncate variant="labels">
                    {component.name}
                  </Text>
                  <Text color="subtle" variant="small">
                    {component.slotIds.length}{" "}
                    {component.slotIds.length === 1 ? "copy" : "copies"}
                  </Text>
                </button>
              )}
              <Flex gap={1}>
                <Tooltip content="Insert a copy after the selected element">
                  <IconButton
                    aria-label={`Insert ${component.name}`}
                    onClick={() => insertCopy(component)}
                  >
                    <PlusIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Rename">
                  <IconButton
                    aria-label={`Rename ${component.name}`}
                    onClick={() => {
                      setDraftName(component.name);
                      setRenaming(component.fragmentId);
                    }}
                  >
                    <EllipsesIcon />
                  </IconButton>
                </Tooltip>
              </Flex>
            </div>
          ))}
        </Box>
      </ScrollArea>
    </>
  );
};
