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
};

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
