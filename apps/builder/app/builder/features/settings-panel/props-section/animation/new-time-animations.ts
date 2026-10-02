import { parseCssValue } from "@webstudio-is/css-data";
import type { TimeAnimation } from "@webstudio-is/sdk";

const ms = (value: number) => ({
  type: "unit" as const,
  value,
  unit: "ms" as const,
});

const newTimeAnimation: TimeAnimation = {
  name: "New animation",
  description: "Create a new animation.",
  timing: { duration: ms(600), fill: "both", easing: "ease" },
  keyframes: [{ offset: 0, styles: {} }],
};

const fadeIn: TimeAnimation = {
  name: "Fade in",
  description: "Fade the element in.",
  timing: { duration: ms(600), fill: "both", easing: "ease-out" },
  keyframes: [
    { offset: 0, styles: { opacity: parseCssValue("opacity", "0") } },
    { offset: 1, styles: { opacity: parseCssValue("opacity", "1") } },
  ],
};

const slideUp: TimeAnimation = {
  name: "Slide up",
  description: "Fade the element in while it moves up.",
  timing: { duration: ms(700), fill: "both", easing: "ease-out" },
  keyframes: [
    {
      offset: 0,
      styles: {
        opacity: parseCssValue("opacity", "0"),
        translate: parseCssValue("translate", "0 40px"),
      },
    },
    {
      offset: 1,
      styles: {
        opacity: parseCssValue("opacity", "1"),
        translate: parseCssValue("translate", "0 0"),
      },
    },
  ],
};

const scaleUp: TimeAnimation = {
  name: "Grow",
  description: "Scale the element up slightly.",
  timing: { duration: ms(250), fill: "both", easing: "ease-out" },
  keyframes: [
    { offset: 0, styles: { scale: parseCssValue("scale", "1") } },
    { offset: 1, styles: { scale: parseCssValue("scale", "1.05") } },
  ],
};

const pulse: TimeAnimation = {
  name: "Pulse",
  description: "Grow and shrink once to draw attention.",
  timing: { duration: ms(500), fill: "none", easing: "ease-in-out" },
  keyframes: [
    { offset: 0, styles: { scale: parseCssValue("scale", "1") } },
    { offset: 0.5, styles: { scale: parseCssValue("scale", "1.1") } },
    { offset: 1, styles: { scale: parseCssValue("scale", "1") } },
  ],
};

export const newLoadAnimations = [newTimeAnimation, fadeIn, slideUp];
export const newClickAnimations = [newTimeAnimation, pulse, scaleUp, fadeIn];
export const newHoverAnimations = [newTimeAnimation, scaleUp, fadeIn];
