import type { RunChoice } from "@/components/creative-os/authorize-dialog";

/*
 * The choices offered in the writing tools' authorization dialogs, built
 * from a project's products, segments and angles. Client-safe.
 */

type Named = { id: number; name: string };

export function productChoice(products: Named[]): RunChoice | null {
  if (products.length < 2) return null;
  return {
    name: "product",
    label: "Product",
    defaultValue: "any",
    options: [{ value: "any", label: "All products" }, ...products.map((product) => ({ value: String(product.id), label: product.name }))],
  };
}

export function segmentChoice(segments: (Named & { focus: boolean })[]): RunChoice | null {
  if (!segments.length) return null;
  const focus = segments.find((segment) => segment.focus);
  return {
    name: "segment",
    label: "Audience segment",
    defaultValue: focus ? String(focus.id) : "none",
    options: [
      { value: "none", label: "No particular segment" },
      ...segments.map((segment) => ({ value: String(segment.id), label: `${segment.name}${segment.focus ? " (your focus)" : ""}` })),
    ],
  };
}

export function angleChoice(angles: Named[], defaultValue?: number | null): RunChoice {
  return {
    name: "angle",
    label: "Angle",
    defaultValue: defaultValue ? String(defaultValue) : angles[0] ? String(angles[0].id) : "none",
    options: [{ value: "none", label: "No angle: general hooks" }, ...angles.map((angle) => ({ value: String(angle.id), label: angle.name }))],
  };
}

export const LANGUAGE_CHOICE: RunChoice = {
  name: "language",
  label: "Language",
  defaultValue: "english",
  options: [
    { value: "english", label: "English" },
    { value: "georgian", label: "Georgian" },
    { value: "russian", label: "Russian" },
  ],
};

export const LANGUAGES = ["English", "Georgian", "Russian"];
