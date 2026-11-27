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
  ai_video: { label: "AI-generated video script", video: true, sections: ["Shot 1: hook", "Shot 2", "Shot 3", "Shot 4", "Shot 5: call to action"] },
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

/**
 * AI video tools, for the plan's recommendation and for you. What each is
 * good at, as of November 2026 (from public comparisons; prices and terms
 * change, so check the tool before paying).
 */
export const VIDEO_TOOLS = {
  avatar_heygen: {
    label: "HeyGen (AI avatar)",
    kind: "avatar",
    bestFor: "A person talking to camera: UGC-style testimonials, founder-style explainers, many languages and lip-sync.",
    works: "Give it the whole spoken script and pick an avatar and voice; it generates the talking-head video. B-roll comes from elsewhere.",
    url: "https://www.heygen.com",
  },
  avatar_arcads: {
    label: "Arcads (AI UGC actors)",
    kind: "avatar",
    bestFor: "The most realistic UGC-style actors for performance ads; priced per video, the most expensive here.",
    works: "Give it the script per actor and pick actors; it returns UGC-style clips to cut together.",
    url: "https://www.arcads.ai",
  },
  veo: {
    label: "Google Veo 3.1",
    kind: "generator",
    bestFor: "Realistic scenes and product shots with sound generated together (dialogue, ambience, effects). Clips of about 4–8 seconds.",
    works: "One prompt per shot; can start from a reference image (a real product photo) for accuracy. Through Gemini or Google Flow.",
    url: "https://deepmind.google/models/veo/",
  },
  runway: {
    label: "Runway",
    kind: "generator",
    bestFor: "Cinematic, controllable brand-film shots; strong camera control and editing tools around the generator.",
    works: "One prompt per shot, usually from a reference image; assemble and add sound in its editor or yours.",
    url: "https://runwayml.com",
  },
  kling: {
    label: "Kling",
    kind: "generator",
    bestFor: "Realistic human motion and longer, stable shots at a competitive price.",
    works: "One prompt per shot, image-to-video works best for consistent people and products.",
    url: "https://klingai.com",
  },
  sora: {
    label: "OpenAI Sora",
    kind: "generator",
    bestFor: "Imaginative, stylised scenes and storytelling shots.",
    works: "One prompt per shot; keep each shot simple and consistent.",
    url: "https://openai.com/sora",
  },
} as const;
export type VideoTool = keyof typeof VIDEO_TOOLS;
export const VIDEO_TOOL_KEYS = Object.keys(VIDEO_TOOLS) as VideoTool[];

export const VIDEO_ASPECTS = ["9:16", "1:1", "4:5", "16:9"] as const;

/**
 * AI image tools, for the plan's recommendation and for you. What each is
 * good at, as of November 2026 (from public comparisons; versions, prices and
 * licensing change, so check the tool before you publish).
 */
export const IMAGE_TOOLS = {
  gpt_image: {
    label: "OpenAI GPT Image (in ChatGPT)",
    bestFor: "Finished ad images with real products and short copy in the image; follows detailed instructions well.",
    works: "Describe the whole ad, quote the exact words to show, and upload a real product photo to keep the product accurate. Edit by asking for changes in the same chat.",
    url: "https://chatgpt.com",
  },
  nano_banana: {
    label: "Google Nano Banana (in Gemini)",
    bestFor: "Editing and combining real photos (your product into a scene), consistent people across images, accurate text.",
    works: "Upload the product photo and describe the scene; ask for edits in plain words.",
    url: "https://gemini.google.com",
  },
  ideogram: {
    label: "Ideogram",
    bestFor: "Text-heavy designs: headlines, offers and posters with readable words in the image.",
    works: "Put the exact headline in quotes in the prompt; choose the aspect ratio and a style.",
    url: "https://ideogram.ai",
  },
  midjourney: {
    label: "Midjourney",
    bestFor: "The most striking, artistic visuals and lifestyle moods; weak at text, so add words in a design tool.",
    works: "Short visual prompt plus parameters (aspect ratio, style); no text in the image.",
    url: "https://www.midjourney.com",
  },
  firefly: {
    label: "Adobe Firefly",
    bestFor: "The safest licensing for commercial use (trained on licensed stock); integrates with Photoshop and Express.",
    works: "Prompt plus style and structure references; finish layout and text in Adobe Express or Photoshop.",
    url: "https://firefly.adobe.com",
  },
  flux: {
    label: "Flux (Black Forest Labs)",
    bestFor: "Photorealistic product and lifestyle shots; strong image editing from a reference.",
    works: "Detailed photographic prompt; use its editing mode with a product photo for accuracy.",
    url: "https://bfl.ai",
  },
} as const;
export type ImageTool = keyof typeof IMAGE_TOOLS;
export const IMAGE_TOOL_KEYS = Object.keys(IMAGE_TOOLS) as ImageTool[];

/** Where images go, with the size to export at. */
export const IMAGE_FORMATS = {
  mix: { label: "A mix for Meta placements", size: "1080×1350 (4:5) feed, 1080×1920 (9:16) Stories and Reels, 1080×1080 (1:1)" },
  feed_portrait: { label: "Feed, portrait 4:5", size: "1080×1350" },
  feed_square: { label: "Feed, square 1:1", size: "1080×1080" },
  story: { label: "Stories and Reels 9:16", size: "1080×1920, key content inside the middle 1080×1420" },
  link: { label: "Link ad 1.91:1", size: "1200×628" },
  website_hero: { label: "Website hero 16:9", size: "1920×1080 (or wider), with room for a headline" },
  website_section: { label: "Website section 4:3", size: "1600×1200" },
} as const;
export type ImageFormat = keyof typeof IMAGE_FORMATS;
