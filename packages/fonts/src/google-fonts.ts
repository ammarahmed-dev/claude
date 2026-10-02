/**
 * A curated list of Google Fonts the font picker offers. Each entry lists the
 * weights to load: a range for variable fonts, or the exact static weights.
 * A wrong weight makes Google reject the request, so each family is loaded
 * with its own stylesheet and one mistake cannot break the others.
 */

export type GoogleFontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "handwriting"
  | "monospace";

export type GoogleFont = {
  family: string;
  category: GoogleFontCategory;
  /** `100..900` for a variable range, or `400;700` for static weights. */
  weights: string;
};

export const GOOGLE_FONTS: readonly GoogleFont[] = [
  { family: "Inter", category: "sans-serif", weights: "100..900" },
  { family: "Roboto", category: "sans-serif", weights: "100..900" },
  { family: "Open Sans", category: "sans-serif", weights: "300..800" },
  { family: "Montserrat", category: "sans-serif", weights: "100..900" },
  {
    family: "Poppins",
    category: "sans-serif",
    weights: "100;200;300;400;500;600;700;800;900",
  },
  { family: "Lato", category: "sans-serif", weights: "100;300;400;700;900" },
  { family: "Raleway", category: "sans-serif", weights: "100..900" },
  { family: "Nunito", category: "sans-serif", weights: "200..1000" },
  { family: "Work Sans", category: "sans-serif", weights: "100..900" },
  { family: "DM Sans", category: "sans-serif", weights: "100..1000" },
  { family: "Manrope", category: "sans-serif", weights: "200..800" },
  { family: "Rubik", category: "sans-serif", weights: "300..900" },
  { family: "Karla", category: "sans-serif", weights: "200..800" },
  { family: "Outfit", category: "sans-serif", weights: "100..900" },
  { family: "Plus Jakarta Sans", category: "sans-serif", weights: "200..800" },
  { family: "Figtree", category: "sans-serif", weights: "300..900" },
  { family: "Sora", category: "sans-serif", weights: "100..800" },
  { family: "Lexend", category: "sans-serif", weights: "100..900" },
  { family: "Urbanist", category: "sans-serif", weights: "100..900" },
  { family: "Archivo", category: "sans-serif", weights: "100..900" },
  { family: "Space Grotesk", category: "sans-serif", weights: "300..700" },
  { family: "Hanken Grotesk", category: "sans-serif", weights: "100..900" },
  { family: "Schibsted Grotesk", category: "sans-serif", weights: "400..900" },
  {
    family: "Bricolage Grotesque",
    category: "sans-serif",
    weights: "200..800",
  },
  { family: "Source Sans 3", category: "sans-serif", weights: "200..900" },
  {
    family: "IBM Plex Sans",
    category: "sans-serif",
    weights: "100;200;300;400;500;600;700",
  },
  { family: "Noto Sans", category: "sans-serif", weights: "100..900" },
  {
    family: "Barlow",
    category: "sans-serif",
    weights: "100;200;300;400;500;600;700;800;900",
  },
  {
    family: "Fira Sans",
    category: "sans-serif",
    weights: "100;200;300;400;500;600;700;800;900",
  },
  { family: "Josefin Sans", category: "sans-serif", weights: "100..700" },
  { family: "Quicksand", category: "sans-serif", weights: "300..700" },
  { family: "Syne", category: "sans-serif", weights: "400..800" },
  { family: "Playfair Display", category: "serif", weights: "400..900" },
  { family: "Merriweather", category: "serif", weights: "300;400;700;900" },
  { family: "Lora", category: "serif", weights: "400..700" },
  { family: "Source Serif 4", category: "serif", weights: "200..900" },
  { family: "Noto Serif", category: "serif", weights: "100..900" },
  { family: "PT Serif", category: "serif", weights: "400;700" },
  { family: "Libre Baskerville", category: "serif", weights: "400;700" },
  {
    family: "Cormorant Garamond",
    category: "serif",
    weights: "300;400;500;600;700",
  },
  { family: "EB Garamond", category: "serif", weights: "400..800" },
  { family: "Bitter", category: "serif", weights: "100..900" },
  { family: "Fraunces", category: "serif", weights: "100..900" },
  { family: "Instrument Serif", category: "serif", weights: "400" },
  { family: "Oswald", category: "display", weights: "200..700" },
  { family: "Bebas Neue", category: "display", weights: "400" },
  { family: "Anton", category: "display", weights: "400" },
  { family: "Abril Fatface", category: "display", weights: "400" },
  { family: "Pacifico", category: "handwriting", weights: "400" },
  { family: "Caveat", category: "handwriting", weights: "400..700" },
  { family: "Dancing Script", category: "handwriting", weights: "400..700" },
  { family: "JetBrains Mono", category: "monospace", weights: "100..800" },
  { family: "Fira Code", category: "monospace", weights: "300..700" },
  {
    family: "IBM Plex Mono",
    category: "monospace",
    weights: "100;200;300;400;500;600;700",
  },
  { family: "Space Mono", category: "monospace", weights: "400;700" },
];

const genericFallback: Record<GoogleFontCategory, string> = {
  "sans-serif": "sans-serif",
  serif: "serif",
  display: "sans-serif",
  handwriting: "cursive",
  monospace: "monospace",
};

export const findGoogleFont = (family: string) =>
  GOOGLE_FONTS.find((font) => font.family === family);

/** Font stack with a sensible fallback, e.g. `"DM Sans", sans-serif`. */
export const getGoogleFontStack = (font: GoogleFont) => [
  font.family,
  genericFallback[font.category],
];

/** The stylesheet address for one family, or undefined when it is not known. */
export const getGoogleFontStylesheetUrl = (family: string) => {
  const font = findGoogleFont(family);
  if (font === undefined) {
    return;
  }
  const name = font.family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${font.weights}&display=swap`;
};

/** Stylesheet addresses for the families a site uses, in order, without repeats. */
export const getGoogleFontStylesheetUrls = (families: readonly string[]) =>
  Array.from(new Set(families))
    .map(getGoogleFontStylesheetUrl)
    .filter((url): url is string => url !== undefined);
