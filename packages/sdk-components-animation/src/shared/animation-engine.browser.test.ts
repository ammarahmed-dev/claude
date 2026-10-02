import { afterEach, describe, expect, test } from "vitest";
import type { AnimationAction } from "@webstudio-is/sdk";
import { startAnimationAction } from "./animation-engine";

const opacity = (value: number) => ({
  type: "unit" as const,
  value,
  unit: "number" as const,
});

const ms = (value: number) => ({
  type: "unit" as const,
  value,
  unit: "ms" as const,
});

const setup = () => {
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";
  const child = document.createElement("div");
  child.textContent = "Animated";
  wrapper.append(child);
  document.body.append(wrapper);
  return { wrapper, child };
};

const fade = {
  keyframes: [
    { offset: 0, styles: { opacity: opacity(0) } },
    { offset: 1, styles: { opacity: opacity(1) } },
  ],
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("animation engine in a browser", () => {
  test("page load plays a time-based animation on the children", async () => {
    const { wrapper, child } = setup();
    const stop = startAnimationAction(wrapper, {
      type: "load",
      animations: [{ ...fade, timing: { duration: ms(200) } }],
    });
    const [animation] = child.getAnimations();
    expect(animation).toBeDefined();
    expect(animation.effect?.getTiming().duration).toBe(200);
    await animation.finished;
    expect(getComputedStyle(child).opacity).toBe("1");
    stop();
    expect(child.getAnimations()).toHaveLength(0);
  });

  test("click plays on click, and toggles back on the second click", () => {
    const { wrapper, child } = setup();
    const action: AnimationAction = {
      type: "click",
      toggle: true,
      animations: [{ ...fade, timing: { duration: ms(1000) } }],
    };
    const stop = startAnimationAction(wrapper, action);
    expect(child.getAnimations()).toHaveLength(0);
    child.click();
    const [first] = child.getAnimations();
    expect(first.effect?.getTiming().direction).toBe("normal");
    child.click();
    const reversed = child
      .getAnimations()
      .find((animation) => animation !== first);
    expect(reversed?.effect?.getTiming().direction).toBe("reverse");
    stop();
  });

  test("hover plays on enter and back on leave", () => {
    const { wrapper, child } = setup();
    const stop = startAnimationAction(wrapper, {
      type: "hover",
      animations: [{ ...fade, timing: { duration: ms(300) } }],
    });
    child.dispatchEvent(new PointerEvent("pointerenter"));
    expect(child.getAnimations()[0]?.effect?.getTiming().direction).toBe(
      "normal"
    );
    child.dispatchEvent(new PointerEvent("pointerleave"));
    const after = child.getAnimations();
    expect(after).toHaveLength(1);
    expect(after[0]?.effect?.getTiming().direction).toBe("reverse");
    stop();
  });

  test("view animations attach to the element and follow its visibility", () => {
    const { wrapper, child } = setup();
    const stop = startAnimationAction(wrapper, {
      type: "view",
      animations: [{ ...fade, timing: {} }],
    });
    const animations = child.getAnimations();
    expect(animations).toHaveLength(1);
    // native ViewTimeline where supported, otherwise a paused animation
    // whose progress follows the scroll
    const native = "ViewTimeline" in globalThis;
    expect(animations[0].timeline === document.timeline).toBe(!native);
    stop();
    expect(child.getAnimations()).toHaveLength(0);
  });

  test("scroll animations work too", () => {
    const { wrapper, child } = setup();
    const stop = startAnimationAction(wrapper, {
      type: "scroll",
      animations: [{ ...fade, timing: {} }],
    });
    expect(child.getAnimations()).toHaveLength(1);
    stop();
  });

  test("does nothing without animations", () => {
    const { wrapper, child } = setup();
    startAnimationAction(wrapper, { type: "load", animations: [] });
    expect(child.getAnimations()).toHaveLength(0);
  });
});

describe("view animation with a duration", () => {
  test("plays once for the duration when the element is visible", async () => {
    const { wrapper, child } = setup();
    const stop = startAnimationAction(wrapper, {
      type: "view",
      animations: [{ ...fade, timing: { duration: ms(150), fill: "both" } }],
    });
    // the first frame is held while waiting
    expect(getComputedStyle(child).opacity).toBe("0");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const playing = child
      .getAnimations()
      .find((animation) => animation.playState !== "paused");
    expect(playing?.effect?.getTiming().duration).toBe(150);
    stop();
  });
});
