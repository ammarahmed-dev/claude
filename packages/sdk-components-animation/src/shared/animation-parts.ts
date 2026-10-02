/**
 * Split text and stagger animations play the group's keyframes on several
 * parts (characters, words or child elements), each shifted along the same
 * timeline. A sliding window sets how many parts move at once.
 */

export const easingCurves: Record<string, string> = {
  linear: "linear",
  ease: "ease",
  easeIn: "cubic-bezier(0.42, 0, 1, 1)",
  easeInCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
  easeInQuart: "cubic-bezier(0.5, 0, 0.75, 0)",
  easeOut: "cubic-bezier(0, 0, 0.58, 1)",
  easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
  easeInOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeInOutQuart: "cubic-bezier(0.76, 0, 0.24, 1)",
};

/**
 * Where part `index` of `count` runs on a 0..1 timeline.
 * window 0 is a typewriter (each part appears at once), window 1 moves one
 * part at a time, larger windows overlap neighbouring parts.
 */
export const getPartRange = (
  index: number,
  count: number,
  slidingWindow: number
): [number, number] => {
  if (count <= 1) {
    return [0, 1];
  }
  const window = Math.max(0, slidingWindow);
  if (window === 0) {
    const start = index / count;
    return [start, Math.min(1, start + 0.0001)];
  }
  const total = count - 1 + window;
  return [index / total, (index + window) / total];
};

/** Offsets per the Web Animations rules: missing ones are spaced evenly. */
export const computeOffsets = (keyframes: Keyframe[]) => {
  const offsets = keyframes.map((keyframe) =>
    typeof keyframe.offset === "number" ? keyframe.offset : undefined
  );
  if (offsets.length === 0) {
    return [];
  }
  if (offsets.length === 1) {
    return [offsets[0] ?? 1];
  }
  offsets[0] ??= 0;
  offsets[offsets.length - 1] ??= 1;
  let previous = 0;
  for (let index = 1; index < offsets.length; index += 1) {
    if (offsets[index] !== undefined) {
      const gap = index - previous;
      const from = offsets[previous]!;
      const to = offsets[index]!;
      for (let step = 1; step < gap; step += 1) {
        offsets[previous + step] = from + ((to - from) * step) / gap;
      }
      previous = index;
    }
  }
  return offsets as number[];
};

const stylesOf = (keyframe: Keyframe): Keyframe => {
  const {
    offset: _offset,
    easing: _easing,
    composite: _composite,
    ...styles
  } = keyframe;
  return styles;
};

/** Squeezes keyframes into [start, end] and holds the first and last state. */
export const remapKeyframes = (
  keyframes: Keyframe[],
  start: number,
  end: number,
  easing?: string
): Keyframe[] => {
  if (start === 0 && end === 1 && easing === undefined) {
    return keyframes;
  }
  const offsets = computeOffsets(keyframes);
  const mapped: Keyframe[] = keyframes.map((keyframe, index) => ({
    ...keyframe,
    offset: start + offsets[index] * (end - start),
    ...(easing === undefined ? {} : { easing }),
  }));
  if (start > 0 && offsets[0] === 0) {
    mapped.unshift({ ...stylesOf(keyframes[0]), offset: 0 });
  }
  if (end < 1 && offsets[offsets.length - 1] === 1) {
    mapped.push({ ...stylesOf(keyframes[keyframes.length - 1]), offset: 1 });
  }
  return mapped;
};

export type SplitMode = "char" | "space" | 'symbol "#"' | 'symbol "~"';

/**
 * Splits text into pieces for animation. Whitespace stays as plain text so
 * lines still wrap between words; symbols used as separators are removed.
 */
export const splitText = (
  text: string,
  mode: SplitMode
): Array<{ type: "part" | "space"; value: string; word?: number }> => {
  if (mode === 'symbol "#"' || mode === 'symbol "~"') {
    const symbol = mode === 'symbol "#"' ? "#" : "~";
    return text
      .split(symbol)
      .filter((piece) => piece !== "")
      .map((value) => ({ type: "part" as const, value }));
  }
  const result: Array<{
    type: "part" | "space";
    value: string;
    word?: number;
  }> = [];
  let word = 0;
  for (const piece of text.split(/(\s+)/)) {
    if (piece === "") {
      continue;
    }
    if (/^\s+$/.test(piece)) {
      result.push({ type: "space", value: piece });
      continue;
    }
    if (mode === "char") {
      for (const char of Array.from(piece)) {
        result.push({ type: "part", value: char, word });
      }
    } else {
      result.push({ type: "part", value: piece, word });
    }
    word += 1;
  }
  return result;
};

const partStyle = "display:inline-block;white-space:pre";

/**
 * Replaces the text inside `container` with spans, one per part, and returns
 * the spans plus a function that puts the original text back.
 */
export const splitTextIntoParts = (
  container: HTMLElement,
  mode: SplitMode
): { parts: HTMLElement[]; restore: () => void } => {
  const document = container.ownerDocument;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.nodeValue !== null && node.nodeValue.trim() !== "") {
      textNodes.push(node);
    }
  }
  const parts: HTMLElement[] = [];
  const replaced: Array<{ original: Text; inserted: Node[] }> = [];
  const hadLabel = container.hasAttribute("aria-label");
  const label = container.textContent ?? "";

  for (const textNode of textNodes) {
    const inserted: Node[] = [];
    let wordSpan: HTMLElement | undefined;
    let currentWord: number | undefined;
    for (const piece of splitText(textNode.nodeValue ?? "", mode)) {
      if (piece.type === "space") {
        wordSpan = undefined;
        currentWord = undefined;
        inserted.push(document.createTextNode(piece.value));
        continue;
      }
      const span = document.createElement("span");
      span.setAttribute("style", partStyle);
      span.setAttribute("aria-hidden", "true");
      span.dataset.bdflowPart = "";
      span.textContent = piece.value;
      parts.push(span);
      if (mode === "char" && piece.word !== undefined) {
        // keep the characters of a word together so lines break between words
        if (wordSpan === undefined || currentWord !== piece.word) {
          wordSpan = document.createElement("span");
          wordSpan.setAttribute(
            "style",
            "display:inline-block;white-space:nowrap"
          );
          wordSpan.setAttribute("aria-hidden", "true");
          currentWord = piece.word;
          inserted.push(wordSpan);
        }
        wordSpan.appendChild(span);
      } else {
        inserted.push(span);
      }
    }
    textNode.replaceWith(...inserted);
    replaced.push({ original: textNode, inserted });
  }
  if (hadLabel === false && parts.length > 0) {
    container.setAttribute("aria-label", label.trim());
  }

  return {
    parts,
    restore: () => {
      for (const { original, inserted } of replaced) {
        const first = inserted[0];
        if (first?.parentNode) {
          first.parentNode.insertBefore(original, first);
        }
        for (const node of inserted) {
          node.parentNode?.removeChild(node);
        }
      }
      if (hadLabel === false) {
        container.removeAttribute("aria-label");
      }
    },
  };
};
