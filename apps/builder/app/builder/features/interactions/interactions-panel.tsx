import { useStore } from "@nanostores/react";
import { Button, Flex, Grid, Text, theme } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $selectedInstancePath,
  $selectedInstanceSelector,
  selectInstance,
} from "~/shared/nano-states";
import { wrapInstance } from "~/shared/instance-utils/mutation";
import { SettingsPanel } from "~/builder/features/settings-panel";

/**
 * Interactions are the animation components. An element gets an interaction
 * by being wrapped in one, and the wrapper holds the controls.
 */
export const interactionKinds = [
  {
    name: "AnimateChildren",
    label: "Animate element",
    description:
      "Animate the element on page load, as it scrolls into view, while scrolling, on click or on hover.",
  },
  {
    name: "AnimateText",
    label: "Split text animation",
    description:
      "Animate text letter by letter or word by word. Works on headings and paragraphs.",
  },
  {
    name: "StaggerAnimation",
    label: "Stagger children",
    description:
      "Animate the items inside this element one after another, such as cards in a grid.",
  },
] as const;

type KnownInteractionName =
  | "AnimateChildren"
  | "AnimateText"
  | "StaggerAnimation"
  | "VideoAnimation";

type InteractionName = KnownInteractionName;

const knownInteractionNames: readonly KnownInteractionName[] = [
  "AnimateChildren",
  "AnimateText",
  "StaggerAnimation",
  "VideoAnimation",
];

/** Registered component names can be namespaced, e.g. `ns:AnimateChildren`. */
export const findInteractionComponent = (
  components: Iterable<string>,
  name: InteractionName
) => {
  for (const component of components) {
    if (component === name || component.endsWith(`:${name}`)) {
      return component;
    }
  }
};

export const getInteractionName = (
  components: Iterable<string>,
  component: string
): InteractionName | undefined =>
  knownInteractionNames.find(
    (name) =>
      findInteractionComponent([component], name) !== undefined &&
      findInteractionComponent(components, name) === component
  );

export const InteractionsPanel = ({
  selectedInstance,
  selectedInstanceKey,
}: {
  selectedInstance: Instance;
  selectedInstanceKey: string;
}) => {
  const metas = useStore($registeredComponentMetas);
  const path = useStore($selectedInstancePath);
  const components = Array.from(metas.keys());
  const ownKind = getInteractionName(components, selectedInstance.component);
  const parent = path?.[1];
  const parentKind =
    parent === undefined
      ? undefined
      : getInteractionName(components, parent.instance.component);

  const groupComponent = findInteractionComponent(
    components,
    "AnimateChildren"
  );

  /**
   * Split text and stagger need an Animation Group around them: the group
   * holds the trigger and keyframes, the inner wrapper splits the content.
   */
  const addInteraction = (name: InteractionName, component: string) => {
    if (name === "AnimateChildren" || parentKind === "AnimateChildren") {
      wrapInstance(component);
      return;
    }
    const elementId = path?.[0]?.instance.id;
    if (groupComponent === undefined || elementId === undefined) {
      return;
    }
    wrapInstance(groupComponent);
    const groupSelector = $selectedInstanceSelector.get();
    if (groupSelector === undefined || groupSelector[0] === elementId) {
      return;
    }
    selectInstance([elementId, ...groupSelector]);
    wrapInstance(component);
    // land on the group, where the trigger and animation are set
    selectInstance(groupSelector);
  };

  if (path === undefined || path.length === 1) {
    return (
      <Text color="subtle" css={{ padding: theme.panel.paddingInline }}>
        Select an element on the page to add an interaction.
      </Text>
    );
  }

  if (ownKind !== undefined) {
    return (
      <>
        {ownKind !== "AnimateChildren" &&
          parentKind === "AnimateChildren" &&
          parent !== undefined && (
            <Grid gap={2} css={{ padding: theme.panel.paddingInline }}>
              <Text color="subtle">
                These settings choose how the content is split. The trigger and
                keyframes are on the Animation Group around it.
              </Text>
              <Button
                color="neutral"
                onClick={() => selectInstance(parent.instanceSelector)}
                css={{ justifySelf: "start" }}
              >
                Edit trigger and keyframes
              </Button>
            </Grid>
          )}
        <SettingsPanel
          key={selectedInstance.id}
          selectedInstance={selectedInstance}
          selectedInstanceKey={selectedInstanceKey}
        />
      </>
    );
  }

  return (
    <Grid gap={3} css={{ padding: theme.panel.paddingInline }}>
      {parentKind !== undefined && parent !== undefined && (
        <Grid gap={2}>
          <Text variant="labels">This element is animated</Text>
          <Text color="subtle">
            Its interaction is set on the wrapper around it.
          </Text>
          <Button
            color="primary"
            onClick={() => selectInstance(parent.instanceSelector)}
          >
            Edit interaction
          </Button>
        </Grid>
      )}
      <Grid gap={2}>
        <Text variant="labels">
          {parentKind === undefined ? "Add an interaction" : "Add another"}
        </Text>
        {interactionKinds.map((kind) => {
          const component = findInteractionComponent(components, kind.name);
          if (component === undefined) {
            return null;
          }
          return (
            <Flex key={kind.name} direction="column" gap="1">
              <Button
                color="neutral"
                onClick={() => addInteraction(kind.name, component)}
                css={{ justifySelf: "start" }}
              >
                {kind.label}
              </Button>
              <Text color="subtle">{kind.description}</Text>
            </Flex>
          );
        })}
      </Grid>
    </Grid>
  );
};
