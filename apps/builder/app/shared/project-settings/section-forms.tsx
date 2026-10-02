import { useCallback, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  Grid,
  IconButton,
  InputField,
  Label,
  Separator,
  Text,
  theme,
  cssVar,
} from "@webstudio-is/design-system";
import { CopyIcon } from "@webstudio-is/icons";
import { fetch } from "~/shared/fetch.client";
import { $project } from "~/shared/sync/data-stores";
import { CopyToClipboard } from "~/shared/copy-to-clipboard";
import { sectionSpacing } from "./utils";

type Submission = {
  id: string;
  formName: string;
  data: Record<string, string>;
  createdAt: string;
};

/** Project editors live on a `p-<id>` host. The public endpoint is on the app host. */
export const getFormEndpoint = (location: Location, projectId: string) => {
  const host = location.host
    .replace(/^p-[0-9a-f-]+-dot-/i, "")
    .replace(/^p-[0-9a-f-]+\./i, "");
  return `${location.protocol}//${host}/forms/submit/${projectId}`;
};

export const SectionForms = ({ projectId }: { projectId?: string }) => {
  const project = useStore($project);
  const effectiveProjectId = projectId ?? project?.id ?? "";
  const [submissions, setSubmissions] = useState<Submission[]>();
  const [error, setError] = useState<string>();
  const endpoint =
    effectiveProjectId === ""
      ? ""
      : getFormEndpoint(window.location, effectiveProjectId);

  const load = useCallback(async () => {
    if (effectiveProjectId === "") {
      return;
    }
    setError(undefined);
    try {
      const response = await fetch(
        `/rest/forms/${encodeURIComponent(effectiveProjectId)}`
      );
      if (response.ok === false) {
        throw new Error(
          response.status === 403
            ? "You need edit access to see submissions."
            : "Submissions could not be loaded."
        );
      }
      const body = (await response.json()) as { submissions: Submission[] };
      setSubmissions(body.submissions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Submissions could not be loaded."
      );
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Forms
      </Text>
      <Text color="subtle" css={sectionSpacing}>
        Forms on the published site can send their answers here. Use a Webhook
        Form element and paste this address as its action, with the POST method.
        Add a hidden field named <code>_form</code> to label the form.
      </Text>
      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor="form-endpoint">Form address</Label>
        <Flex gap={1} align="center">
          <InputField id="form-endpoint" value={endpoint} readOnly />
          <CopyToClipboard text={endpoint} copyText="Copy address">
            <IconButton aria-label="Copy address">
              <CopyIcon aria-hidden />
            </IconButton>
          </CopyToClipboard>
        </Flex>
      </Grid>
      <Separator />
      <Flex justify="between" align="center" css={sectionSpacing}>
        <Text variant="labels">
          Submissions{submissions ? ` (${submissions.length})` : ""}
        </Text>
        <Button color="neutral" onClick={() => void load()}>
          Refresh
        </Button>
      </Flex>
      {error && (
        <Text color="destructive" css={sectionSpacing}>
          {error}
        </Text>
      )}
      {submissions?.length === 0 && (
        <Text color="subtle" css={sectionSpacing}>
          No submissions yet.
        </Text>
      )}
      <Grid gap={2} css={sectionSpacing}>
        {submissions?.map((submission) => (
          <Grid
            key={submission.id}
            gap={1}
            css={{
              padding: theme.spacing[5],
              borderRadius: theme.borderRadius[4],
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: cssVar("--border-default"),
            }}
          >
            <Text variant="labels">
              {submission.formName || "Untitled form"} ·{" "}
              {new Date(submission.createdAt).toLocaleString()}
            </Text>
            {Object.entries(submission.data).map(([key, value]) => (
              <Text key={key} userSelect="text">
                <strong>{key}:</strong> {value}
              </Text>
            ))}
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
};
