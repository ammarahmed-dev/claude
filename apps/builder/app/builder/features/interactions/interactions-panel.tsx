import { useStore } from "@nanostores/react";
import { Button, Flex, Grid, Text, theme } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $selectedInstancePath,
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
    label: "Add animation",
    description:
      "Animate the element on page load, as it scrolls into view, while scrolling, on click or on hover.",
  },
  // Text, stagger and video animations are listed again once they have a
  // runtime; upstream ships them as empty placeholders.
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

  if (path === undefined || path.length === 1) {
    return (
      <Text color="subtle" css={{ padding: theme.panel.paddingInline }}>
        Select an element on the page to add an interaction.
      </Text>
    );
  }

  if (ownKind !== undefined) {
    return (
      <SettingsPanel
        key={selectedInstance.id}
        selectedInstance={selectedInstance}
        selectedInstanceKey={selectedInstanceKey}
      />
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
                onClick={() => wrapInstance(component)}
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
