import { Flex, LinkButton, Text } from "@webstudio-is/design-system";
import { useStore } from "@nanostores/react";
import { Main } from "../shared/layout";
import { CreateProject } from "../projects/project-dialogs";
import { $permissions } from "~/shared/nano-states";

export const Welcome = ({
  currentWorkspaceId,
}: {
  currentWorkspaceId?: string;
}) => {
  const permissions = useStore($permissions);
  return (
    <Main>
      <Flex
        direction="column"
        align="center"
        grow
        gap="7"
        css={{ paddingBlock: "20vh" }}
      >
        <Text variant="brandMediumTitle" as="h3">
          Welcome!
        </Text>

        <Flex align="center" gap="3">
          <LinkButton href="/dashboard" target="_blank">
            Start from a template
          </LinkButton>
          {permissions.canCreateProject && (
            <CreateProject
              workspaceId={currentWorkspaceId}
              buttonText="Create a blank project"
            />
          )}
        </Flex>
      </Flex>
    </Main>
  );
};

undefined;
