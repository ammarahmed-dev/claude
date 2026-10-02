import { useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Flex,
  Grid,
  PanelTitle,
  ScrollArea,
  Separator,
  Switch,
  Text,
  Label,
  theme,
  css,
  cssVar,
} from "@webstudio-is/design-system";
import { getAllPages } from "@webstudio-is/sdk";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import { $selectedPage, selectPage } from "~/shared/nano-states/pages";
import { selectInstance } from "~/shared/nano-states";
import { auditPage, type AuditIssue } from "./audit-rules";

const issueButton = css({
  all: "unset",
  display: "grid",
  gap: theme.spacing[2],
  padding: `${theme.spacing[4]} ${theme.panel.paddingInline}`,
  cursor: "pointer",
  borderBottom: `1px solid ${cssVar("--border-default")}`,
  "&:hover, &:focus-visible": {
    backgroundColor: cssVar("--background-secondary"),
  },
});

const severityDot = (severity: AuditIssue["severity"]) =>
  css({
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 6,
    backgroundColor:
      severity === "error"
        ? cssVar("--foreground-negative")
        : cssVar("--foreground-warning"),
  })();

export const AuditPanel = (_props: { onClose: () => void }) => {
  const pages = useStore($pages);
  const instances = useStore($instances);
  const props = useStore($props);
  const selectedPage = useStore($selectedPage);
  const [allPages, setAllPages] = useState(false);

  const issues = useMemo(() => {
    if (pages === undefined) {
      return [];
    }
    const list = allPages
      ? getAllPages(pages)
      : selectedPage === undefined
        ? []
        : [selectedPage];
    return list.flatMap((page) =>
      // xml and text documents (sitemaps, robots.txt) are not web pages
      page.meta.documentType === undefined || page.meta.documentType === "html"
        ? auditPage({ page, instances, props })
        : []
    );
  }, [pages, instances, props, selectedPage, allPages]);

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  const pageNames = new Map(
    pages === undefined
      ? []
      : getAllPages(pages).map((page) => [page.id, page.name])
  );

  const reveal = (issue: AuditIssue) => {
    if (issue.pageId !== selectedPage?.id) {
      selectPage(issue.pageId);
    }
    if (issue.instanceSelector !== undefined) {
      selectInstance(issue.instanceSelector);
    }
  };

  return (
    <>
      <PanelTitle>Audit</PanelTitle>
      <Separator />
      <Grid gap={2} css={{ padding: theme.panel.padding }}>
        <Flex align="center" justify="between">
          <Label htmlFor="audit-all-pages">Check all pages</Label>
          <Switch
            id="audit-all-pages"
            checked={allPages}
            onCheckedChange={setAllPages}
          />
        </Flex>
        <Text color="subtle">
          {issues.length === 0
            ? "No issues found."
            : `${errors} ${errors === 1 ? "error" : "errors"}, ${warnings} ${warnings === 1 ? "warning" : "warnings"}`}
        </Text>
      </Grid>
      <Separator />
      <ScrollArea>
        <Box>
          {issues.map((issue) => (
            <button
              key={issue.id}
              type="button"
              className={issueButton()}
              onClick={() => reveal(issue)}
            >
              <Flex gap={2} align="start">
                <span className={severityDot(issue.severity)} aria-hidden />
                <Grid gap={1}>
                  <Text>{issue.message}</Text>
                  {allPages && (
                    <Text color="subtle" variant="small">
                      {pageNames.get(issue.pageId) ?? "Page"}
                    </Text>
                  )}
                </Grid>
              </Flex>
            </button>
          ))}
        </Box>
      </ScrollArea>
    </>
  );
};
