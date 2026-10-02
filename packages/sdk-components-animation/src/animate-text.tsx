import { forwardRef, type ElementRef } from "react";

const easings = {
  linear: true,
  easeIn: true,
  easeInCubic: true,
  easeInQuart: true,
  easeOut: true,
  easeOutCubic: true,
  easeOutQuart: true,
  ease: true,
  easeInOutCubic: true,
  easeInOutQuart: true,
};

const split = {
  char: true,
  space: true,
  'symbol "#"': true,
  'symbol "~"': true,
};

type AnimateChildrenProps = {
  /**
   * Size of the sliding window for the animation:
   * - 0: Typewriter effect (no animation).
   * - (0..1]: Animates one part of the text at a time.
   * - (1..n]: Animates multiple parts of the text within the sliding window.
   */
  slidingWindow?: number;
  /**
   * Easing function applied within the sliding window.
   */
  easing?: keyof typeof easings;
  /**
   * Text content to animate.
   */
  children: React.ReactNode;
  /**
   * Defines how the text is split for animation (e.g., by character, space, or symbol).
   */
  splitBy?: keyof typeof split;
} & {
  className?: string;
};

export const AnimateText = forwardRef<ElementRef<"div">, AnimateChildrenProps>(
  (
    { slidingWindow = 5, easing = "linear", splitBy = "char", ...props },
    ref
  ) => {
    // The Animation Group around this element splits the text and animates
    // each piece; these attributes tell it how.
    return (
      <div
        ref={ref}
        data-bdflow-parts="text"
        data-bdflow-split={splitBy}
        data-bdflow-window={slidingWindow}
        data-bdflow-easing={easing}
        {...props}
      />
    );
  }
);

const displayName = "AnimateText";
AnimateText.displayName = displayName;
