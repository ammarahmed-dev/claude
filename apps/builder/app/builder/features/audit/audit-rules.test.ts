import { describe, expect, test } from "vitest";
import type { Instance, Prop } from "@webstudio-is/sdk";
import { auditPage } from "./audit-rules";

const el = (
  id: string,
  tag: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: "ws:element",
  tag,
  children,
});

const comp = (
  id: string,
  component: string,
  children: Instance["children"] = []
): Instance => ({ type: "instance", id, component, children });

const text = (value: string) => ({ type: "text" as const, value });
const ref = (value: string) => ({ type: "id" as const, value });

const str = (instanceId: string, name: string, value: string): Prop => ({
  id: `${instanceId}-${name}`,
  instanceId,
  name,
  type: "string",
  value,
});

const page = (
  overrides: Partial<{ title: string; description: string }> = {}
) => ({
  id: "page",
  title: overrides.title ?? `"Home"`,
  rootInstanceId: "body",
  meta: { description: overrides.description ?? `"About us"` },
});

const run = (list: Instance[], props: Prop[] = [], pageOverrides = {}) =>
  auditPage({
    page: page(pageOverrides),
    instances: new Map(list.map((item) => [item.id, item])),
    props: new Map(props.map((item) => [item.id, item])),
  });

const rules = (issues: ReturnType<typeof run>) => issues.map((i) => i.rule);

describe("auditPage", () => {
  test("a clean page has no issues", () => {
    const issues = run(
      [
        el("body", "body", [ref("h1"), ref("img"), ref("a")]),
        el("h1", "h1", [text("Welcome")]),
        el("img", "img"),
        el("a", "a", [text("Contact")]),
      ],
      [str("img", "alt", "Team photo")]
    );
    expect(issues).toEqual([]);
  });

  test("flags images without alt and accepts an empty alt as decorative", () => {
    const issues = run(
      [
        el("body", "body", [ref("h1"), ref("one"), ref("two")]),
        el("h1", "h1", [text("Hi")]),
        comp("one", "Image"),
        comp("two", "Image"),
      ],
      [str("two", "alt", "")]
    );
    expect(rules(issues)).toEqual(["image-alt"]);
    expect(issues[0].instanceSelector).toEqual(["one", "body"]);
  });

  test("flags links and buttons with nothing to read", () => {
    const issues = run(
      [
        el("body", "body", [
          ref("h1"),
          ref("empty"),
          ref("icon"),
          ref("labelled"),
          ref("btn"),
        ]),
        el("h1", "h1", [text("Hi")]),
        comp("empty", "Link"),
        el("icon", "a", [ref("logo")]),
        el("logo", "img"),
        el("labelled", "a"),
        comp("btn", "Button", [text("  ")]),
      ],
      [str("logo", "alt", "Home"), str("labelled", "aria-label", "Menu")]
    );
    expect(rules(issues)).toEqual(["link-name", "button-name"]);
  });

  test("checks heading order and the H1", () => {
    expect(
      rules(
        run([
          el("body", "body", [ref("a"), ref("b"), ref("c")]),
          el("a", "h1", [text("A")]),
          el("b", "h3", [text("B")]),
          el("c", "h1", [text("C")]),
        ])
      )
    ).toEqual(["heading-skip", "heading-multiple-h1"]);
    expect(
      rules(run([el("body", "body", [ref("a")]), el("a", "h2", [text("A")])]))
    ).toEqual(["heading-missing-h1"]);
  });

  test("reads the Heading component's tag", () => {
    expect(
      rules(
        run(
          [
            el("body", "body", [ref("a"), ref("b")]),
            comp("a", "Heading", [text("A")]),
            comp("b", "Heading", [text("B")]),
          ],
          [str("a", "tag", "h1"), str("b", "tag", "h4")]
        )
      )
    ).toEqual(["heading-skip"]);
  });

  test("flags a missing page title and description", () => {
    expect(
      rules(run([el("body", "body")], [], { title: `""`, description: "" }))
    ).toEqual(["page-title", "page-description"]);
  });
});
