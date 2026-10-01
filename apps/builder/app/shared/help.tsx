import { ContentIcon } from "@webstudio-is/icons";

export const socialLinks = [] as Array<{
  label: string;
  url: string;
  icon: React.ReactNode;
}>;

export const help = [
  {
    label: "Documentation",
    url: "https://github.com/ammarahmed-dev/claude",
    icon: <ContentIcon />,
  },
] as const;
