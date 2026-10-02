import type { Instance } from "@webstudio-is/sdk";
import { SettingsSection } from "./settings-section";
import { PropsSectionContainer } from "./props-section/props-section";
import { VariablesSection } from "./variables-section";
import {
  Box,
  Flex,
  Link,
  PanelBanner,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { UpgradeIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $isDesignMode, $permissions } from "~/shared/nano-states";

export const SettingsPanel = ({
  selectedInstance,
  selectedInstanceKey,
}: {
  selectedInstance: Instance;
  selectedInstanceKey: string;
}) => {
  const { allowDynamicData } = useStore($permissions);
  const isDesignMode = useStore($isDesignMode);

  return (
    <Box css={{ pt: theme.spacing[5] }}>
      <SettingsSection />

      <PropsSectionContainer
        selectedInstance={selectedInstance}
        selectedInstanceKey={selectedInstanceKey}
      />

      {isDesignMode && <VariablesSection />}

      {allowDynamicData === false && (
        <PanelBanner>
          <Text variant="regularBold">Upgrade for CMS on custom domains</Text>
          <Text>
            Integrate content from other tools to create blogs, directories, and
            any other structured content. You can preview CMS on staging without
            upgrading.
          </Text>
          <Flex align="center" gap={1}>
            <UpgradeIcon />
            <Link color="inherit" target="_blank" href="/dashboard">
              Upgrade to Pro
            </Link>
          </Flex>
        </PanelBanner>
      )}
    </Box>
  );
};
