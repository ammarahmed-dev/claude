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
} from "@webstudio-is/design-system";
import { EllipsesIcon, TrashIcon } from "@webstudio-is/icons";
import type { StyleSource } from "@webstudio-is/sdk";
import { $styles, $styleSources } from "~/shared/sync/data-stores";
import { $selectedStyleSources } from "~/shared/nano-states";
import {
  $styleSourceUsages,
  DeleteStyleSourceDialog,
  RenameStyleSourceDialog,
  deleteStyleSource,
  openDeleteUnusedTokensDialog,
} from "~/builder/shared/style-source-actions";
import { showInstance } from "~/builder/features/command-panel/shared/instance-list";

type Token = Extract<StyleSource, { type: "token" }>;

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

export type TokenRow = {
  token: Token;
  usages: number;
  declarations: number;
};

/** Classes sorted by name, with how many elements and styles use each. */
export const getTokenRows = (
  styleSources: Iterable<StyleSource>,
  usages: Map<string, Set<string>>,
  styles: Iterable<{ styleSourceId: string }>
): TokenRow[] => {
  const declarations = new Map<string, number>();
  for (const style of styles) {
    declarations.set(
      style.styleSourceId,
      (declarations.get(style.styleSourceId) ?? 0) + 1
    );
  }
  const rows: TokenRow[] = [];
  for (const styleSource of styleSources) {
    if (styleSource.type !== "token") {
      continue;
    }
    rows.push({
      token: styleSource,
      usages: usages.get(styleSource.id)?.size ?? 0,
      declarations: declarations.get(styleSource.id) ?? 0,
    });
  }
  return rows.sort((a, b) =>
    a.token.name.localeCompare(b.token.name, undefined, { numeric: true })
  );
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export const StyleSelectorsPanel = (_props: { onClose: () => void }) => {
  const styleSources = useStore($styleSources);
  const usages = useStore($styleSourceUsages);
  const styles = useStore($styles);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<Token>();
  const [deleting, setDeleting] = useState<Token>();

  const rows = useMemo(
    () => getTokenRows(styleSources.values(), usages, styles.values()),
    [styleSources, usages, styles]
  );
  const visible = rows.filter((item) =>
    item.token.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const unused = rows.filter((item) => item.usages === 0).length;

  const reveal = (item: TokenRow) => {
    const [firstInstanceId] = usages.get(item.token.id) ?? [];
    if (firstInstanceId === undefined) {
      return;
    }
    showInstance(firstInstanceId, "style");
    const selected = new Map($selectedStyleSources.get());
    selected.set(firstInstanceId, item.token.id);
    $selectedStyleSources.set(selected);
  };

  return (
    <>
      <PanelTitle>Style selectors</PanelTitle>
      <Separator />
      <Grid gap={2} css={{ padding: theme.panel.padding }}>
        <InputField
          aria-label="Search classes"
          placeholder="Search classes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Flex align="center" justify="between" gap={2}>
          <Text color="subtle">
            {plural(rows.length, "class", "classes")}, {unused} unused
          </Text>
          <Button
            color="neutral"
            disabled={unused === 0}
            onClick={openDeleteUnusedTokensDialog}
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
                ? "No classes yet. Add one to an element in the Style panel."
                : "No class matches."}
            </Text>
          )}
          {visible.map((item) => (
            <div key={item.token.id} className={row()}>
              <button
                type="button"
                className={nameButton()}
                onClick={() => reveal(item)}
                title={
                  item.usages === 0
                    ? "Not used on any element"
                    : "Select the first element that uses this class"
                }
              >
                <Text truncate variant="labels">
                  {item.token.name}
                </Text>
                <Text color="subtle" variant="small">
                  {item.usages === 0
                    ? "Unused"
                    : plural(item.usages, "element", "elements")}{" "}
                  · {plural(item.declarations, "style", "styles")}
                </Text>
              </button>
              <Flex gap={1}>
                <Tooltip content="Rename">
                  <IconButton
                    aria-label={`Rename ${item.token.name}`}
                    onClick={() => setRenaming(item.token)}
                  >
                    <EllipsesIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Delete">
                  <IconButton
                    aria-label={`Delete ${item.token.name}`}
                    onClick={() => setDeleting(item.token)}
                  >
                    <TrashIcon />
                  </IconButton>
                </Tooltip>
              </Flex>
            </div>
          ))}
        </Box>
      </ScrollArea>
      <RenameStyleSourceDialog
        styleSource={renaming}
        onClose={() => setRenaming(undefined)}
        onConfirm={() => setRenaming(undefined)}
      />
      <DeleteStyleSourceDialog
        styleSource={deleting}
        onClose={() => setDeleting(undefined)}
        onConfirm={(styleSourceId) => {
          deleteStyleSource(styleSourceId);
          setDeleting(undefined);
        }}
      />
    </>
  );
};
