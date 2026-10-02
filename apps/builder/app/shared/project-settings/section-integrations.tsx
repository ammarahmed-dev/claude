import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Grid,
  InputField,
  Label,
  Separator,
  Text,
} from "@webstudio-is/design-system";
import { $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { sectionSpacing } from "./utils";
import {
  getIntegrationValue,
  integrations,
  isValidIntegrationValue,
  setIntegrationValue,
  type IntegrationId,
} from "./integrations";

const saveCode = (code: string) => {
  executeRuntimeMutation({
    id: "projectSettings.update",
    input: { meta: { code } },
  });
};

const IntegrationField = ({
  id,
  code,
}: {
  id: IntegrationId;
  code: string;
}) => {
  const definition = integrations.find((item) => item.id === id)!;
  const saved = getIntegrationValue(code, id);
  const [value, setValue] = useState(saved);
  useEffect(() => {
    setValue(saved);
  }, [saved]);
  const invalid =
    value.trim() !== "" && !isValidIntegrationValue(id, value.trim());
  const commit = () => {
    if (invalid || value.trim() === saved) {
      return;
    }
    saveCode(setIntegrationValue(code, id, value));
  };
  const inputId = `integration-${id}`;
  return (
    <Grid gap={1} css={sectionSpacing}>
      <Label htmlFor={inputId}>{definition.label}</Label>
      <Text color="subtle">{definition.description}</Text>
      <InputField
        id={inputId}
        aria-label={`${definition.label} ${definition.inputLabel}`}
        placeholder={definition.placeholder}
        value={value}
        color={invalid ? "error" : undefined}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
      />
      {invalid && (
        <Text color="destructive">
          Enter a valid {definition.inputLabel.toLowerCase()}, for example{" "}
          {definition.placeholder}.
        </Text>
      )}
    </Grid>
  );
};

export const SectionIntegrations = (_props: { projectId?: string }) => {
  const projectSettings = useStore($projectSettings);
  const code = projectSettings?.meta?.code ?? "";
  const groups = Array.from(new Set(integrations.map((item) => item.group)));
  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        Integrations
      </Text>
      <Text color="subtle" css={sectionSpacing}>
        Add tracking and verification to the published site. Each integration is
        added to the custom code in the &lt;head&gt; of every page and runs only
        on the published site. Clear a field to remove it.
      </Text>
      {groups.map((group) => (
        <Grid key={group} gap={2}>
          <Separator />
          <Text variant="labels" css={sectionSpacing}>
            {group}
          </Text>
          {integrations
            .filter((item) => item.group === group)
            .map((item) => (
              <IntegrationField key={item.id} id={item.id} code={code} />
            ))}
        </Grid>
      ))}
    </Grid>
  );
};
