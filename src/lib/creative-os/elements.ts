/*
 * The direct-response elements an ad is broken into, shared by the analysis
 * (as the allowed values Claude must choose from) and the page (as the
 * colours of the highlighted transcript). Each colour carries a label beside
 * it, so the element never rests on colour alone.
 */

export const ELEMENTS = [
  "hook",
  "pattern_interrupt",
  "customer_identification",
  "problem_identification",
  "problem_agitation",
  "emotional_escalation",
  "story",
  "product_introduction",
  "unique_mechanism",
  "benefits",
  "reasons_to_believe",
  "social_proof",
  "authority",
  "objection_handling",
  "offer",
  "urgency",
  "scarcity",
  "cta",
  "other",
] as const;

export type Element = (typeof ELEMENTS)[number];

/** Grouped by the job each does in the ad, so related elements share a colour family. */
export const ELEMENT_STYLE: Record<Element, { label: string; bg: string; text: string }> = {
  hook: { label: "Hook", bg: "#fde7c4", text: "#7a4a00" },
  pattern_interrupt: { label: "Pattern interrupt", bg: "#fdd9b5", text: "#7a3d00" },
  customer_identification: { label: "Customer identification", bg: "#e3e8fd", text: "#2b3a8f" },
  problem_identification: { label: "Problem", bg: "#fbd4d4", text: "#8a1c1c" },
  problem_agitation: { label: "Agitation", bg: "#f8c2c2", text: "#7d1414" },
  emotional_escalation: { label: "Emotional escalation", bg: "#f6cde6", text: "#7c1e5c" },
  story: { label: "Story", bg: "#ece0fb", text: "#552a8a" },
  product_introduction: { label: "Product introduction", bg: "#cfe8fb", text: "#0b4f80" },
  unique_mechanism: { label: "Unique mechanism", bg: "#c4e2f9", text: "#0a4a7a" },
  benefits: { label: "Benefits", bg: "#d3f0dd", text: "#1d5e34" },
  reasons_to_believe: { label: "Reasons to believe", bg: "#cdeee6", text: "#14594b" },
  social_proof: { label: "Social proof", bg: "#d8f1cf", text: "#2f5e1d" },
  authority: { label: "Authority", bg: "#d9ead3", text: "#33572a" },
  objection_handling: { label: "Objection handling", bg: "#e6e6f7", text: "#3c3c7a" },
  offer: { label: "Offer", bg: "#fff1b8", text: "#6b5600" },
  urgency: { label: "Urgency", bg: "#ffe3a3", text: "#6b4a00" },
  scarcity: { label: "Scarcity", bg: "#ffdca0", text: "#6b4200" },
  cta: { label: "Call to action", bg: "#c9e6ff", text: "#0f4c81" },
  other: { label: "Other", bg: "#ececec", text: "#424242" },
};

export const AWARENESS_STAGES = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware", "unclear"] as const;

export const AWARENESS_LABEL: Record<(typeof AWARENESS_STAGES)[number], string> = {
  unaware: "Unaware",
  problem_aware: "Problem aware",
  solution_aware: "Solution aware",
  product_aware: "Product aware",
  most_aware: "Most aware",
  unclear: "Unclear from the material",
};

export const SOPHISTICATION_LEVELS = ["1", "2", "3", "4", "5", "unclear"] as const;
