import type { KNOWLEDGE_KINDS } from "@/db/creative-os";

/* Human labels for CreativeOS's stored codes; shared by server pages and client components. */

export const KNOWLEDGE_KIND_LABEL: Record<(typeof KNOWLEDGE_KINDS)[number], string> = {
  brand_guidelines: "Brand guidelines",
  product_docs: "Product documentation",
  brief: "Client brief",
  script: "Existing ad script",
  landing_copy: "Landing page copy",
  customer_research: "Customer research",
  testimonials: "Testimonials",
  specs: "Product specifications",
  messaging: "Approved messaging",
  compliance: "Compliance requirements",
  voice: "Tone of voice",
  ad_example: "Successful ad example",
  note: "Internal note",
  other: "Other",
};

export const OPERATION_KIND_LABEL: Record<string, string> = {
  ad_deconstruction: "Ad deconstruction",
  product_research: "Product research",
  voc_research: "Voice of Customer research",
  audience_segments: "Audience segments",
  awareness_analysis: "Awareness and sophistication",
  competitor_discovery: "Find my rivals",
  competitor_research: "Competitor research",
  market_patterns: "Market patterns",
  transcription: "Video transcript",
  angle_generation: "Angles",
  hook_generation: "Hooks",
  script_writing: "Script writing",
  section_rewrite: "Section rewrite",
  script_review: "Creative director review",
  brief_generation: "Production brief",
  video_plan: "AI video plan",
  image_plan: "AI image plan",
};

/** Where an operation's result is shown, for the history and usage pages. */
export function operationHref(kind: string, projectId: number | null, targetId: number | null): string | null {
  if (!projectId) return null;
  const base = `/admin/creative-os/p/${projectId}`;
  switch (kind) {
    case "ad_deconstruction":
      return targetId ? `${base}/ads/${targetId}` : null;
    case "product_research":
      return targetId ? `${base}/products/${targetId}` : null;
    case "voc_research":
      return `${base}/customers`;
    case "audience_segments":
      return `${base}/audiences`;
    case "awareness_analysis":
      return `${base}/awareness`;
    case "competitor_discovery":
      return `${base}/competitors`;
    case "competitor_research":
      return targetId ? `${base}/competitors/${targetId}` : null;
    case "market_patterns":
      return `${base}/competitors/matrix`;
    case "angle_generation":
      return `${base}/angles`;
    case "hook_generation":
      return `${base}/hooks`;
    case "script_writing":
    case "section_rewrite":
    case "script_review":
    case "brief_generation":
    case "video_plan":
    case "image_plan":
      return targetId ? `${base}/scripts/${targetId}` : null;
    default:
      return null;
  }
}

export const PLATFORMS = ["Meta", "TikTok", "YouTube", "Instagram", "Snapchat", "Pinterest", "Google", "LinkedIn", "X", "Other"];

export const AD_FORMATS = [
  "UGC video",
  "Direct-response video",
  "Founder video",
  "Product demonstration",
  "Static image",
  "Carousel",
  "Advertorial",
  "VSL",
  "Other",
];
