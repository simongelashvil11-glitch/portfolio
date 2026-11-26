/*
 * The fixed vocabularies of CreativeOS's writing tools — angles, hooks,
 * copy, reviews and briefs — shared by the schemas Claude answers in and the
 * pages. Client-safe: no server imports.
 */

export const ANGLE_CATEGORIES = [
  "problem_solution",
  "unique_mechanism",
  "transformation",
  "emotional_story",
  "myth_busting",
  "expert_explanation",
  "demonstration",
  "customer_experience",
  "founder_story",
  "objection_reversal",
  "comparison",
  "convenience",
  "cost_comparison",
  "lifestyle",
  "identity",
] as const;

export const ANGLE_CATEGORY_LABEL: Record<(typeof ANGLE_CATEGORIES)[number], string> = {
  problem_solution: "Problem–solution",
  unique_mechanism: "Unique mechanism",
  transformation: "Transformation",
  emotional_story: "Emotional storytelling",
  myth_busting: "Myth-busting",
  expert_explanation: "Expert explanation",
  demonstration: "Product demonstration",
  customer_experience: "Customer experience",
  founder_story: "Founder story",
  objection_reversal: "Objection reversal",
  comparison: "Product comparison",
  convenience: "Convenience",
  cost_comparison: "Cost comparison",
  lifestyle: "Lifestyle improvement",
  identity: "Identity and aspiration",
};

export const ANGLE_STATUSES = ["idea", "prioritized", "approved", "rejected", "archived"] as const;
export const ANGLE_STATUS_LABEL: Record<string, string> = {
  idea: "Idea",
  prioritized: "Prioritised",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

export const HOOK_CATEGORIES = [
  "question",
  "curiosity",
  "problem",
  "contrarian",
  "story",
  "educational",
  "transformation",
  "demonstration",
  "comparison",
  "objection",
  "founder",
  "offer",
] as const;

export const HOOK_CATEGORY_LABEL: Record<(typeof HOOK_CATEGORIES)[number], string> = {
  question: "Question",
  curiosity: "Curiosity",
  problem: "Problem recognition",
  contrarian: "Contrarian",
  story: "Story",
  educational: "Educational",
  transformation: "Transformation",
  demonstration: "Demonstration",
  comparison: "Comparison",
  objection: "Objection-based",
  founder: "Founder",
  offer: "Direct offer",
};

export const HOOK_STATUSES = ["draft", "approved", "rejected", "archived"] as const;
export const HOOK_STATUS_LABEL: Record<string, string> = { draft: "Draft", approved: "Approved", rejected: "Rejected", archived: "Archived" };

/** What can be written, with the sections a first draft is split into (the writer may adapt them). */
export const COPY_KINDS = {
  ugc_script: { label: "UGC video script", video: true, sections: ["Hook", "Problem", "Discovery", "Proof", "Result", "Call to action"] },
  dr_video_script: { label: "Direct-response video script", video: true, sections: ["Hook", "Problem", "Agitation", "Solution", "Mechanism", "Proof", "Offer", "Call to action"] },
  tiktok_script: { label: "TikTok script", video: true, sections: ["Hook (first 2 seconds)", "Body", "Payoff", "Call to action"] },
  founder_ad: { label: "Founder ad", video: true, sections: ["Hook", "Who I am", "Why we made it", "What it does", "Proof", "Call to action"] },
  demo_script: { label: "Product demonstration script", video: true, sections: ["Hook", "The problem on screen", "Demonstration", "Result", "Call to action"] },
  vsl: { label: "VSL script", video: true, sections: ["Hook", "Story", "Problem", "Mechanism", "Proof", "Offer", "Guarantee", "Call to action"] },
  meta_primary_text: { label: "Meta primary text", video: false, sections: ["Opening line", "Body", "Call to action"] },
  meta_headlines: { label: "Meta headlines", video: false, sections: ["Headlines"] },
  static_ad: { label: "Static ad copy", video: false, sections: ["Headline", "Subheadline", "Supporting text", "Call to action"] },
  retargeting_ad: { label: "Retargeting ad", video: false, sections: ["Opening line", "Objection handled", "Offer", "Call to action"] },
  advertorial: { label: "Advertorial", video: false, sections: ["Headline", "Lead", "Story", "Mechanism", "Proof", "Offer", "Call to action"] },
  landing_page: { label: "Landing page copy", video: false, sections: ["Headline", "Subheadline", "Problem", "Solution", "Benefits", "Proof", "Offer", "FAQ", "Call to action"] },
  email: { label: "Email", video: false, sections: ["Subject line", "Preview text", "Body", "Call to action"] },
} as const;
export type CopyKind = keyof typeof COPY_KINDS;
export const COPY_KIND_KEYS = Object.keys(COPY_KINDS) as CopyKind[];

export const FRAMEWORKS = {
  freeform: "Freeform: the writer chooses",
  aida: "AIDA (attention, interest, desire, action)",
  pas: "PAS (problem, agitate, solve)",
  bab: "BAB (before, after, bridge)",
  storytelling: "Storytelling",
  unique_mechanism: "Unique mechanism",
  objection_reversal: "Objection reversal",
  demonstration: "Product demonstration",
  testimonial: "Testimonial structure",
} as const;
export type Framework = keyof typeof FRAMEWORKS;

export const SCRIPT_STATUS_LABEL: Record<string, string> = { draft: "Draft", approved: "Approved", archived: "Archived" };

/** The creative director's rubric. */
export const REVIEW_CRITERIA = [
  "hook_strength",
  "message_clarity",
  "audience_relevance",
  "emotional_relevance",
  "specificity",
  "differentiation",
  "mechanism_clarity",
  "credibility",
  "proof",
  "objection_handling",
  "offer_clarity",
  "cta_strength",
  "originality",
  "natural_language",
  "platform_fit",
  "brand_voice",
  "compliance",
  "repetition",
  "generic_ai_patterns",
] as const;

export const REVIEW_CRITERION_LABEL: Record<(typeof REVIEW_CRITERIA)[number], string> = {
  hook_strength: "Hook strength",
  message_clarity: "Message clarity",
  audience_relevance: "Audience relevance",
  emotional_relevance: "Emotional relevance",
  specificity: "Specificity",
  differentiation: "Product differentiation",
  mechanism_clarity: "Unique mechanism clarity",
  credibility: "Credibility",
  proof: "Proof",
  objection_handling: "Objection handling",
  offer_clarity: "Offer clarity",
  cta_strength: "CTA strength",
  originality: "Originality",
  natural_language: "Natural spoken language",
  platform_fit: "Platform suitability",
  brand_voice: "Brand voice consistency",
  compliance: "Compliance safety",
  repetition: "Free of needless repetition",
  generic_ai_patterns: "Free of generic AI patterns",
};

export const EDITORIAL_ISSUES = [
  "generic_phrase",
  "unnatural_spoken",
  "excessive_adjectives",
  "repetitive_structure",
  "empty_claim",
  "unnecessary_transition",
  "weak_specificity",
  "overly_polished",
  "robotic",
  "unsubstantiated",
  "cliche",
] as const;

export const EDITORIAL_ISSUE_LABEL: Record<(typeof EDITORIAL_ISSUES)[number], string> = {
  generic_phrase: "Generic marketing phrase",
  unnatural_spoken: "Unnatural when spoken",
  excessive_adjectives: "Too many adjectives",
  repetitive_structure: "Repetitive sentence structure",
  empty_claim: "Empty claim",
  unnecessary_transition: "Unnecessary transition",
  weak_specificity: "Not specific enough",
  overly_polished: "Overly polished",
  robotic: "Robotic phrasing",
  unsubstantiated: "Unsubstantiated statement",
  cliche: "Marketing cliché",
};

export const REVIEW_VERDICTS = ["ready", "needs_work", "rethink"] as const;
export const REVIEW_VERDICT_LABEL: Record<string, { label: string; className: string }> = {
  ready: { label: "Ready to produce", className: "border-[#9fd89f] bg-[#f1faf1] text-[#0e700e]" },
  needs_work: { label: "Needs work", className: "border-[#f9d5a7] bg-[#fff9f2] text-[#8a4b00]" },
  rethink: { label: "Rethink it", className: "border-[#f1bbbc] bg-[#fdf3f4] text-danger" },
};

export const BRIEF_AUDIENCES = {
  ugc_creator: "UGC creator",
  video_editor: "Video editor",
  designer: "Designer",
  actor: "Actor or presenter",
} as const;
export type BriefAudience = keyof typeof BRIEF_AUDIENCES;
