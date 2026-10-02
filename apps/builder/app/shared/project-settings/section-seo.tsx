import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  Grid,
  InputField,
  Label,
  Separator,
  Switch,
  Text,
  TextArea,
  css,
  cssVar,
  theme,
} from "@webstudio-is/design-system";
import { getImageAttributes, wsImageLoader } from "@webstudio-is/image";
import type { ProjectMeta } from "@webstudio-is/sdk";
import { $assets, $projectSettings } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { ImageControl } from "./image-control";
import { sectionSpacing } from "./utils";

const iconStyle = css({
  objectFit: "contain",
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: cssVar("--border-default"),
});

const save = (meta: Partial<ProjectMeta>) => {
  executeRuntimeMutation({
    id: "projectSettings.update",
    input: { meta },
  });
};

/** `https://example.com` or `example.com`, without a path query or hash. */
export const isValidSiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }
  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    );
    return url.hostname.includes(".") && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
};

/** BCP 47 language tags such as `en`, `de`, `pt-BR` or `zh-Hant`. */
export const isValidLanguageCode = (value: string) =>
  value.trim() === "" || /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value.trim());

const TextSetting = ({
  id,
  label,
  description,
  placeholder,
  value,
  isValid,
  error,
  onSave,
}: {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  isValid: (value: string) => boolean;
  error: string;
  onSave: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const invalid = isValid(draft) === false;
  const commit = () => {
    if (invalid === false && draft.trim() !== value) {
      onSave(draft.trim());
    }
  };
  return (
    <Grid gap={1} css={sectionSpacing}>
      <Label htmlFor={id}>{label}</Label>
      <Text color="subtle">{description}</Text>
      <InputField
        id={id}
        placeholder={placeholder}
        value={draft}
        color={invalid ? "error" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }
        }}
      />
      {invalid && <Text color="destructive">{error}</Text>}
    </Grid>
  );
};

export const SectionSeo = (_props: { projectId?: string }) => {
  const meta = useStore($projectSettings)?.meta ?? {};
  const assets = useStore($assets);
  const [robots, setRobots] = useState(meta.robotsTxt ?? "");
  useEffect(() => setRobots(meta.robotsTxt ?? ""), [meta.robotsTxt]);
  const webclip = assets.get(meta.webclipAssetId ?? "");

  return (
    <Grid gap={2}>
      <Text variant="titles" css={sectionSpacing}>
        SEO
      </Text>

      <TextSetting
        id="seo-site-url"
        label="Site address"
        description="The address where the site is published. Used for canonical links, the sitemap and robots.txt."
        placeholder="https://example.com"
        value={meta.siteUrl ?? ""}
        isValid={isValidSiteUrl}
        error="Enter an address such as https://example.com."
        onSave={(siteUrl) => save({ siteUrl })}
      />

      <TextSetting
        id="seo-language"
        label="Language code"
        description="The language of the site, for browsers, screen readers and translation tools. Pages can override it."
        placeholder="en"
        value={meta.language ?? ""}
        isValid={isValidLanguageCode}
        error="Enter a language code such as en, de or pt-BR."
        onSave={(language) => save({ language })}
      />

      <Separator />

      <Grid gap={1} css={sectionSpacing}>
        <Flex align="center" justify="between" gap={2}>
          <Label htmlFor="seo-noindex">Hide from search engines</Label>
          <Switch
            id="seo-noindex"
            checked={meta.noIndex === true}
            onCheckedChange={(noIndex) => save({ noIndex })}
          />
        </Flex>
        <Text color="subtle">
          Asks search engines not to list any page. Use it while the site is in
          progress.
        </Text>
      </Grid>

      <Grid gap={1} css={sectionSpacing}>
        <Label htmlFor="seo-robots">robots.txt</Label>
        <Text color="subtle">
          Leave empty to allow all pages and point to the sitemap.
        </Text>
        <TextArea
          id="seo-robots"
          rows={5}
          disabled={meta.noIndex === true}
          placeholder={"User-agent: *\nAllow: /"}
          value={meta.noIndex === true ? "User-agent: *\nDisallow: /" : robots}
          onChange={setRobots}
          onBlur={() => {
            if (robots !== (meta.robotsTxt ?? "")) {
              save({ robotsTxt: robots });
            }
          }}
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={sectionSpacing} justify="start">
        <Label>Home screen icon</Label>
        <Grid flow="column" gap={3}>
          <img
            className={iconStyle()}
            {...getImageAttributes({
              width: 72,
              height: 72,
              src: webclip?.name,
              loader: wsImageLoader,
            })}
          />
          <Grid gap={2}>
            <Text color="subtle">
              Shown when someone saves the site to a phone's home screen. Use a
              square image of at least 180 by 180 pixels.
            </Text>
            <ImageControl
              onAssetIdChange={(webclipAssetId) => save({ webclipAssetId })}
            >
              <Button color="primary" css={{ justifySelf: "start" }}>
                Upload
              </Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
