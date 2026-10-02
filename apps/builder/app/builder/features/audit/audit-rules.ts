import {
  elementComponent,
  type Instance,
  type Instances,
  type Page,
  type Prop,
} from "@webstudio-is/sdk";

export type AuditSeverity = "error" | "warning";

export type AuditIssue = {
  id: string;
  rule:
    | "image-alt"
    | "link-name"
    | "button-name"
    | "heading-skip"
    | "heading-multiple-h1"
    | "heading-missing-h1"
    | "page-title"
    | "page-description";
  severity: AuditSeverity;
  message: string;
  pageId: string;
  /** Path from the instance up to the page root, for selecting it. */
  instanceSelector?: string[];
};

type AuditInput = {
  page: Pick<Page, "id" | "title" | "rootInstanceId" | "meta">;
  instances: Instances;
  props: Map<string, Prop>;
};

const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** Component names may carry a package namespace, e.g. `pkg:Image`. */
const isComponent = (instance: Instance, name: string) =>
  instance.component === name || instance.component.endsWith(`:${name}`);

const getTag = (instance: Instance, propsByInstance: Map<string, Prop[]>) => {
  if (instance.component === elementComponent) {
    return instance.tag;
  }
  const tagProp = propsByInstance
    .get(instance.id)
    ?.find((prop) => prop.name === "tag");
  if (tagProp?.type === "string") {
    return tagProp.value;
  }
  if (isComponent(instance, "Heading")) {
    return "h1";
  }
};

const getPropText = (
  propsByInstance: Map<string, Prop[]>,
  instanceId: string,
  name: string
): string | undefined => {
  const prop = propsByInstance
    .get(instanceId)
    ?.find((item) => item.name === name);
  if (prop === undefined) {
    return;
  }
  if (prop.type === "string") {
    return prop.value;
  }
  // bound to data or a CMS field: assume it has a value
  if (prop.type === "expression" || prop.type === "parameter") {
    return "bound";
  }
  return;
};

/**
 * Stored page titles and descriptions are expressions, e.g. `"Home"`.
 * A quoted empty string means nothing was written.
 */
const isBlankExpression = (value: string | undefined) =>
  value === undefined || /^\s*(""|''|``)?\s*$/.test(value);

const isImage = (instance: Instance) =>
  isComponent(instance, "Image") ||
  (instance.component === elementComponent && instance.tag === "img");

const isLink = (instance: Instance) =>
  isComponent(instance, "Link") ||
  isComponent(instance, "RichTextLink") ||
  (instance.component === elementComponent && instance.tag === "a");

const isButton = (instance: Instance) =>
  isComponent(instance, "Button") ||
  (instance.component === elementComponent && instance.tag === "button");

export const auditPage = ({ page, instances, props }: AuditInput) => {
  const issues: AuditIssue[] = [];
  const propsByInstance = new Map<string, Prop[]>();
  for (const prop of props.values()) {
    const list = propsByInstance.get(prop.instanceId) ?? [];
    list.push(prop);
    propsByInstance.set(prop.instanceId, list);
  }

  const add = (issue: Omit<AuditIssue, "id" | "pageId">) => {
    issues.push({
      ...issue,
      pageId: page.id,
      id: `${page.id}:${issue.rule}:${issue.instanceSelector?.[0] ?? ""}:${issues.length}`,
    });
  };

  const hasAccessibleText = (instanceId: string, seen = new Set<string>()) => {
    if (seen.has(instanceId)) {
      return false;
    }
    seen.add(instanceId);
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    if (
      getPropText(propsByInstance, instanceId, "aria-label")?.trim() ||
      getPropText(propsByInstance, instanceId, "title")?.trim()
    ) {
      return true;
    }
    if (isImage(instance)) {
      return Boolean(getPropText(propsByInstance, instanceId, "alt")?.trim());
    }
    for (const child of instance.children) {
      if (child.type === "text" && child.value.trim() !== "") {
        return true;
      }
      if (child.type === "expression") {
        return true;
      }
      if (child.type === "id" && hasAccessibleText(child.value, seen)) {
        return true;
      }
    }
    return false;
  };

  const headings: Array<{ level: number; selector: string[] }> = [];

  const visit = (instanceId: string, parentSelector: string[]) => {
    const instance = instances.get(instanceId);
    if (instance === undefined || parentSelector.includes(instanceId)) {
      return;
    }
    const selector = [instanceId, ...parentSelector];

    if (isImage(instance)) {
      const alt = getPropText(propsByInstance, instanceId, "alt");
      if (alt === undefined) {
        add({
          rule: "image-alt",
          severity: "error",
          message:
            "Image has no alt text. Describe it, or set an empty alt if it is decorative.",
          instanceSelector: selector,
        });
      }
    } else if (isLink(instance) && hasAccessibleText(instanceId) === false) {
      add({
        rule: "link-name",
        severity: "error",
        message:
          "Link has no text. Add text, an image with alt text, or an aria-label.",
        instanceSelector: selector,
      });
    } else if (isButton(instance) && hasAccessibleText(instanceId) === false) {
      add({
        rule: "button-name",
        severity: "error",
        message: "Button has no text. Add text or an aria-label.",
        instanceSelector: selector,
      });
    }

    const tag = getTag(instance, propsByInstance);
    if (tag !== undefined && headingTags.has(tag)) {
      headings.push({ level: Number(tag.slice(1)), selector });
    }

    for (const child of instance.children) {
      if (child.type === "id") {
        visit(child.value, selector);
      }
    }
  };

  visit(page.rootInstanceId, []);

  let previous = 0;
  for (const heading of headings) {
    if (previous !== 0 && heading.level > previous + 1) {
      add({
        rule: "heading-skip",
        severity: "warning",
        message: `Heading jumps from H${previous} to H${heading.level}. Use H${previous + 1} so the outline has no gaps.`,
        instanceSelector: heading.selector,
      });
    }
    previous = heading.level;
  }
  const h1s = headings.filter((heading) => heading.level === 1);
  if (headings.length > 0 && h1s.length === 0) {
    add({
      rule: "heading-missing-h1",
      severity: "warning",
      message: "Page has no H1. Make the main heading an H1.",
    });
  }
  for (const extra of h1s.slice(1)) {
    add({
      rule: "heading-multiple-h1",
      severity: "warning",
      message: "Page has more than one H1. Keep one H1 for the main heading.",
      instanceSelector: extra.selector,
    });
  }

  if (isBlankExpression(page.title)) {
    add({
      rule: "page-title",
      severity: "error",
      message: "Page has no title. Set it in Page settings.",
    });
  }
  if (isBlankExpression(page.meta.description)) {
    add({
      rule: "page-description",
      severity: "warning",
      message:
        "Page has no meta description. Search results show it under the title.",
    });
  }

  return issues;
};
