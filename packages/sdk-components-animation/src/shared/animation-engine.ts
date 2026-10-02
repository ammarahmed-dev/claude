import { toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  easingCurves,
  getPartRange,
  remapKeyframes,
  splitTextIntoParts,
  type SplitMode,
} from "./animation-parts";
import type {
  AnimationAction,
  AnimationKeyframe,
  DurationUnitValue,
  RangeUnitValue,
} from "@webstudio-is/sdk";

/**
 * Open implementation of the animation runtime used by the Animation Group.
 *
 * Scroll and view animations use native scroll-driven animations
 * (ScrollTimeline / ViewTimeline) where the browser has them, and fall back
 * to scroll listeners and IntersectionObserver elsewhere. Load, click and
 * hover animations are plain time-based Web Animations.
 */

type Timing = {
  easing?: string;
  fill?: FillMode;
  duration?: DurationUnitValue;
  delay?: DurationUnitValue;
  iterations?: number | "infinite";
  rangeStart?: [string, RangeUnitValue];
  rangeEnd?: [string, RangeUnitValue];
};

type AnyAnimation = {
  keyframes: AnimationKeyframe[];
  timing: Timing;
  enabled?: [string, boolean][];
};

const camelCase = (property: string) =>
  property.startsWith("--")
    ? property
    : property.replace(/-([a-z])/g, (_, letter: string) =>
        letter.toUpperCase()
      );

/** Converts stored keyframes into Web Animations keyframes. */
export const toWebKeyframes = (keyframes: AnimationKeyframe[]): Keyframe[] =>
  keyframes.map((keyframe) => {
    const result: Keyframe = {};
    if (keyframe.offset !== undefined) {
      result.offset = keyframe.offset;
    }
    for (const [property, value] of Object.entries(keyframe.styles)) {
      result[camelCase(property)] = toValue(value as StyleValue);
    }
    return result;
  });

/** Duration in milliseconds, or undefined for CSS variables and missing values. */
export const toMilliseconds = (value: DurationUnitValue | undefined) => {
  if (value === undefined || value.type !== "unit") {
    return;
  }
  return value.unit === "s" ? value.value * 1000 : value.value;
};

const rangeValueToCss = (value: RangeUnitValue) => {
  if (value.type === "unit") {
    return `${value.value}${value.unit}`;
  }
  if (value.type === "var") {
    return `var(--${value.value})`;
  }
  return value.value;
};

/** View timeline ranges are written as `<name> <length-percentage>`. */
export const viewRangeToCss = (range: [string, RangeUnitValue]) =>
  `${range[0]} ${rangeValueToCss(range[1])}`;

/** Scroll timelines have no named ranges; `end` offsets count from the end. */
export const scrollRangeToCss = (range: [string, RangeUnitValue]) =>
  range[0] === "end"
    ? `calc(100% - ${rangeValueToCss(range[1])})`
    : rangeValueToCss(range[1]);

export const defaultDurationMs = 600;

/** Options for a time-based animation. */
export const toTimeTiming = (timing: Timing): KeyframeAnimationOptions => ({
  duration: toMilliseconds(timing.duration) ?? defaultDurationMs,
  delay: toMilliseconds(timing.delay) ?? 0,
  easing: timing.easing ?? "ease",
  fill: timing.fill ?? "both",
  iterations:
    timing.iterations === "infinite"
      ? Number.POSITIVE_INFINITY
      : (timing.iterations ?? 1),
});

/**
 * One element to animate. `subject` is the element whose visibility, clicks
 * or hover drive it; for split text and stagger parts that is their container.
 * `start` and `end` place the part on the shared timeline.
 */
type AnimationTarget = {
  element: HTMLElement;
  subject: HTMLElement;
  start: number;
  end: number;
  easing?: string;
};

/** Split text and stagger containers mark themselves with these attributes. */
export const partsAttribute = "data-bdflow-parts";

const getAnimationTargets = (
  wrapper: HTMLElement
): { targets: AnimationTarget[]; restore: Cleanup } => {
  const targets: AnimationTarget[] = [];
  const restores: Cleanup[] = [];
  for (const child of Array.from(wrapper.children)) {
    if (child instanceof HTMLElement === false) {
      continue;
    }
    const kind = child.getAttribute(partsAttribute);
    if (kind !== "text" && kind !== "children") {
      targets.push({ element: child, subject: child, start: 0, end: 1 });
      continue;
    }
    const slidingWindow = Number(child.dataset.bdflowWindow ?? "1");
    const easing = easingCurves[child.dataset.bdflowEasing ?? ""];
    let parts: HTMLElement[];
    if (kind === "text") {
      const split = splitTextIntoParts(
        child,
        (child.dataset.bdflowSplit ?? "char") as SplitMode
      );
      parts = split.parts;
      restores.push(split.restore);
    } else {
      parts = Array.from(child.children).filter(
        (part): part is HTMLElement => part instanceof HTMLElement
      );
    }
    parts.forEach((part, index) => {
      const [start, end] = getPartRange(
        index,
        parts.length,
        Number.isFinite(slidingWindow) ? slidingWindow : 1
      );
      targets.push({ element: part, subject: child, start, end, easing });
    });
  }
  return { targets, restore: () => restores.forEach((restore) => restore()) };
};

const uniqueSubjects = (targets: AnimationTarget[]) =>
  Array.from(new Set(targets.map((target) => target.subject)));

const prefersReducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

type Cleanup = () => void;

const getScrollContainer = (
  element: HTMLElement,
  source: "closest" | "nearest" | "root" | undefined
): Element => {
  if (source !== "root") {
    let parent = element.parentElement;
    while (parent !== null && parent !== document.body) {
      const { overflowY, overflowX } = getComputedStyle(parent);
      if (/(auto|scroll)/.test(overflowY + overflowX)) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }
  return document.scrollingElement ?? document.documentElement;
};

const toScrollAxis = (axis: string | undefined) =>
  (axis ?? "block") as "block" | "inline" | "x" | "y";

type ScrollTimelineConstructor = new (options: {
  source: Element;
  axis?: string;
}) => AnimationTimeline;
type ViewTimelineConstructor = new (options: {
  subject: Element;
  axis?: string;
}) => AnimationTimeline;

const getNativeTimelines = () => {
  const scope = globalThis as unknown as {
    ScrollTimeline?: ScrollTimelineConstructor;
    ViewTimeline?: ViewTimelineConstructor;
  };
  return {
    ScrollTimeline: scope.ScrollTimeline,
    ViewTimeline: scope.ViewTimeline,
  };
};

/** Fallback progress of an element through the viewport, 0 to 1. */
const getViewProgress = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const viewport = window.innerHeight;
  const total = viewport + rect.height;
  return Math.min(1, Math.max(0, (viewport - rect.top) / total));
};

const getScrollProgress = (container: Element) => {
  const max = container.scrollHeight - container.clientHeight;
  return max <= 0 ? 0 : Math.min(1, Math.max(0, container.scrollTop / max));
};

const runScrollDriven = (
  wrapper: HTMLElement,
  action: Extract<AnimationAction, { type: "scroll" | "view" }>
): Cleanup => {
  const { ScrollTimeline, ViewTimeline } = getNativeTimelines();
  const animations: Animation[] = [];
  const fallbacks: Array<() => void> = [];
  const axis = toScrollAxis(action.axis);
  const { targets, restore } = getAnimationTargets(wrapper);
  const observers: IntersectionObserver[] = [];

  for (const {
    element: target,
    subject,
    start,
    end,
    easing: partEasing,
  } of targets) {
    for (const animation of action.animations as AnyAnimation[]) {
      const keyframes = remapKeyframes(
        toWebKeyframes(animation.keyframes),
        start,
        end,
        partEasing
      );
      const { easing, fill } = animation.timing;
      // A view animation with a fixed duration plays once, for that duration,
      // when the element scrolls into view.
      if (
        action.type === "view" &&
        toMilliseconds(animation.timing.duration) !== undefined
      ) {
        const options = toTimeTiming(animation.timing);
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            animations.push(target.animate(keyframes, options));
          }
        });
        observer.observe(subject);
        observers.push(observer);
        // hold the first frame until it plays so the element does not flash
        if (options.fill === "both" || options.fill === "backwards") {
          const hold = target.animate(keyframes, { ...options, delay: 0 });
          hold.pause();
          animations.push(hold);
        }
        continue;
      }
      if (action.type === "view" && ViewTimeline !== undefined) {
        const timeline = new ViewTimeline({ subject, axis });
        animations.push(
          target.animate(keyframes, {
            timeline,
            easing: easing ?? "linear",
            fill: fill ?? "both",
            rangeStart: animation.timing.rangeStart
              ? viewRangeToCss(animation.timing.rangeStart)
              : "entry 0%",
            rangeEnd: animation.timing.rangeEnd
              ? viewRangeToCss(animation.timing.rangeEnd)
              : "exit 100%",
          } as KeyframeAnimationOptions)
        );
        continue;
      }
      if (action.type === "scroll" && ScrollTimeline !== undefined) {
        const timeline = new ScrollTimeline({
          source: getScrollContainer(target, action.source),
          axis,
        });
        animations.push(
          target.animate(keyframes, {
            timeline,
            easing: easing ?? "linear",
            fill: fill ?? "both",
            rangeStart: animation.timing.rangeStart
              ? scrollRangeToCss(animation.timing.rangeStart)
              : "0%",
            rangeEnd: animation.timing.rangeEnd
              ? scrollRangeToCss(animation.timing.rangeEnd)
              : "100%",
          } as KeyframeAnimationOptions)
        );
        continue;
      }
      // Fallback: a paused animation whose progress follows the scroll.
      const running = target.animate(keyframes, {
        duration: 1000,
        easing: easing ?? "linear",
        fill: fill ?? "both",
      });
      running.pause();
      animations.push(running);
      const container =
        action.type === "scroll"
          ? getScrollContainer(target, action.source)
          : undefined;
      fallbacks.push(() => {
        const progress =
          container === undefined
            ? getViewProgress(subject)
            : getScrollProgress(container);
        running.currentTime = progress * 1000;
      });
    }
  }

  if (fallbacks.length === 0) {
    return () => {
      observers.forEach((observer) => observer.disconnect());
      animations.forEach((animation) => animation.cancel());
      restore();
    };
  }
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fallbacks.forEach((fn) => fn()));
  };
  update();
  window.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update, { passive: true });
  return () => {
    observers.forEach((observer) => observer.disconnect());
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", update, { capture: true });
    window.removeEventListener("resize", update);
    animations.forEach((animation) => animation.cancel());
    restore();
  };
};

const runTimeBased = (
  wrapper: HTMLElement,
  action: Extract<AnimationAction, { type: "load" | "click" | "hover" }>
): Cleanup => {
  const { targets, restore } = getAnimationTargets(wrapper);
  const subjects = uniqueSubjects(targets);
  const play = (reverse = false) => {
    const created: Animation[] = [];
    for (const target of targets) {
      for (const animation of action.animations as AnyAnimation[]) {
        const options = toTimeTiming(animation.timing);
        const keyframes = remapKeyframes(
          toWebKeyframes(animation.keyframes),
          target.start,
          target.end,
          target.easing
        );
        const running = target.element.animate(keyframes, {
          ...options,
          // playing back runs the same keyframes from the end to the start
          direction: reverse ? "reverse" : "normal",
          // when played back there is nothing to wait for
          delay: reverse ? 0 : options.delay,
        });
        created.push(running);
      }
    }
    return created;
  };

  if (action.type === "load") {
    const created = play();
    return () => {
      created.forEach((animation) => animation.cancel());
      restore();
    };
  }

  let current: Animation[] = [];
  const cancelCurrent = () =>
    current.forEach((animation) => animation.cancel());

  if (action.type === "click") {
    let toggled = false;
    const onClick = () => {
      // a second click plays the animation back when it is set to toggle
      const reverse = action.toggle === true && toggled;
      toggled = !reverse;
      if (action.toggle !== true) {
        cancelCurrent();
      }
      current = play(reverse);
    };
    subjects.forEach((subject) => subject.addEventListener("click", onClick));
    return () => {
      subjects.forEach((subject) =>
        subject.removeEventListener("click", onClick)
      );
      cancelCurrent();
      restore();
    };
  }

  const onEnter = () => {
    cancelCurrent();
    current = play();
  };
  const onLeave = () => {
    cancelCurrent();
    current = play(true);
  };
  subjects.forEach((subject) => {
    subject.addEventListener("pointerenter", onEnter);
    subject.addEventListener("pointerleave", onLeave);
  });
  return () => {
    subjects.forEach((subject) => {
      subject.removeEventListener("pointerenter", onEnter);
      subject.removeEventListener("pointerleave", onLeave);
    });
    cancelCurrent();
    restore();
  };
};

/**
 * Starts the animations of an Animation Group on its children and returns a
 * function that stops them. Does nothing when the visitor asked for reduced
 * motion or the browser lacks Web Animations.
 */
export const startAnimationAction = (
  wrapper: HTMLElement,
  action: AnimationAction | undefined
): Cleanup => {
  if (
    action === undefined ||
    action.animations.length === 0 ||
    typeof Element === "undefined" ||
    typeof Element.prototype.animate !== "function" ||
    prefersReducedMotion()
  ) {
    return () => {};
  }
  if (action.type === "scroll" || action.type === "view") {
    return runScrollDriven(wrapper, action);
  }
  return runTimeBased(wrapper, action);
};
