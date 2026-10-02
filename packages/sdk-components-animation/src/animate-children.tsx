import { forwardRef, useEffect, useRef, type ElementRef } from "react";
import { startAnimationAction } from "./shared/animation-engine";
import type { Hook } from "@webstudio-is/react-sdk";
import type { AnimationAction } from "@webstudio-is/sdk";
import { animationCanPlayOnCanvasProperty } from "@webstudio-is/sdk/runtime";

type ScrollProps = {
  debug?: boolean;
  children?: React.ReactNode;
  action: AnimationAction;
};

const isBuilderCanvas = () =>
  typeof window !== "undefined" &&
  window.self !== window.top &&
  window.location.pathname.startsWith("/canvas");

export const AnimateChildren = forwardRef<ElementRef<"div">, ScrollProps>(
  ({ debug = false, action, ...props }, forwardedRef) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const canPlayOnCanvas =
      (props as Record<string, unknown>)[animationCanPlayOnCanvasProperty] ===
        true || action?.isPinned === true;
    const actionKey = JSON.stringify(action ?? null);

    useEffect(() => {
      const wrapper = localRef.current;
      if (wrapper === null) {
        return;
      }
      // In the editor the animation runs only when asked to, so it does not
      // get in the way of editing.
      if (isBuilderCanvas() && canPlayOnCanvas === false) {
        return;
      }
      let stop = startAnimationAction(wrapper, action);
      // children can render later (lists, CMS items), so restart on changes
      const observer = new MutationObserver(() => {
        stop();
        stop = startAnimationAction(wrapper, action);
      });
      observer.observe(wrapper, { childList: true });
      return () => {
        observer.disconnect();
        stop();
      };
      // the serialized action captures every change to the action object
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actionKey, canPlayOnCanvas]);

    const setRefs = (element: HTMLDivElement | null) => {
      localRef.current = element;
      if (typeof forwardedRef === "function") {
        forwardedRef(element);
      } else if (forwardedRef !== null) {
        forwardedRef.current = element;
      }
    };

    return <div ref={setRefs} style={{ display: "contents" }} {...props} />;
  }
);

const displayName = "AnimateChildren";
AnimateChildren.displayName = displayName;

const namespace = "@webstudio-is/sdk-components-animation";

export const hooksAnimateChildren: Hook = {
  onNavigatorUnselect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        undefined
      );
    }
  },
  onNavigatorSelect: (context, event) => {
    if (
      event.instancePath.length > 0 &&
      event.instancePath[0].component === `${namespace}:${displayName}`
    ) {
      context.setMemoryProp(
        event.instancePath[0],
        animationCanPlayOnCanvasProperty,
        true
      );
    }
  },
};
