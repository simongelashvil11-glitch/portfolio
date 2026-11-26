/*
 * The fixed vocabularies of CreativeOS research, shared by the schemas Claude
 * must answer in and the pages that show the answers. Client-safe: no
 * server imports.
 */

/** What kind of evidence a finding is. Every research finding carries one. */
export const EVIDENCE_TYPES = [
  "verified_fact",
  "reported_claim",
  "customer_statement",
  "ai_interpretation",
  "hypothesis",
  "estimate",
  "recommendation",
  "unknown",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_STYLE: Record<EvidenceType, { label: string; hint: string; className: string }> = {
  verified_fact: {
    label: "Verified fact",
    hint: "Stated on a source that was read, such as the brand's own product page.",
    className: "border-[#9fd89f] bg-[#f1faf1] text-[#0e700e]",
  },
  reported_claim: {
    label: "Reported claim",
    hint: "Something a source says, not independently confirmed.",
    className: "border-[#b4d6fa] bg-[#ebf3fc] text-[#0f548c]",
  },
  customer_statement: {
    label: "Customer statement",
    hint: "What a customer said, in a review or discussion.",
    className: "border-[#d4c1f0] bg-[#f5f0fc] text-[#5c2e91]",
  },
  ai_interpretation: {
    label: "AI interpretation",
    hint: "Claude's reading of the evidence.",
    className: "border-line-strong bg-surface text-muted",
  },
  hypothesis: {
    label: "Hypothesis",
    hint: "A strategic guess worth testing, not a fact.",
    className: "border-[#f9d5a7] bg-[#fff9f2] text-[#8a4b00]",
  },
  estimate: {
    label: "Estimate",
    hint: "An approximation, not a measured figure.",
    className: "border-[#f9d5a7] bg-[#fff9f2] text-[#8a4b00]",
  },
  recommendation: {
    label: "Recommendation",
    hint: "Advice, not evidence.",
    className: "border-[#b4d6fa] bg-[#ebf3fc] text-[#0f548c]",
  },
  unknown: {
    label: "Unknown",
    hint: "Not available from the sources.",
    className: "border-[#f1bbbc] bg-[#fdf3f4] text-danger",
  },
};

/** Voice of Customer categories. */
export const VOC_CATEGORIES = [
  "pain_point",
  "frustration",
  "fear",
  "desire",
  "aspiration",
  "objection",
  "motivation",
  "buying_trigger",
  "failed_solution",
  "belief",
  "misconception",
  "emotional_language",
  "expectation",
  "unmet_need",
  "satisfaction_driver",
  "abandonment_reason",
] as const;
export type VocCategory = (typeof VOC_CATEGORIES)[number];

export const VOC_LABEL: Record<VocCategory, string> = {
  pain_point: "Pain point",
  frustration: "Frustration",
  fear: "Fear",
  desire: "Desire",
  aspiration: "Aspiration",
  objection: "Purchase objection",
  motivation: "Purchase motivation",
  buying_trigger: "Buying trigger",
  failed_solution: "Failed previous solution",
  belief: "Belief",
  misconception: "Misconception",
  emotional_language: "Emotional language",
  expectation: "Product expectation",
  unmet_need: "Unmet need",
  satisfaction_driver: "Satisfaction driver",
  abandonment_reason: "Reason for abandoning",
};

export const CONFIDENCE = ["low", "medium", "high"] as const;
export const EVIDENCE_STRENGTH = ["weak", "moderate", "strong"] as const;

export const QUOTE_CHECK_LABEL: Record<string, { label: string; className: string; hint: string }> = {
  found: {
    label: "Quote found on the page",
    className: "text-[#0e700e]",
    hint: "These exact words were found in the text of the page it came from, read during the research.",
  },
  not_found: {
    label: "Not found on the page",
    className: "text-danger",
    hint: "The page was read, but these words were not found in it. Treat it as a paraphrase until you check the source.",
  },
  no_page: {
    label: "Not checked",
    className: "text-[#8a4b00]",
    hint: "The page itself was not read (only a search result), so the words could not be checked. Open the source to confirm.",
  },
  paraphrase: {
    label: "Paraphrase",
    className: "text-muted",
    hint: "A summary of what customers said, not their exact words.",
  },
  manual: { label: "Added by you", className: "text-muted", hint: "You added this yourself." },
};

/**
 * How far a research run may search. The caps go to the API (`max_uses`),
 * so they are hard limits on a single call, and they keep the call inside
 * the server's 10-step tool loop and the hosting time limit.
 */
export const DEPTHS = {
  quick: { label: "Quick", searches: 2, fetches: 2, hint: "2 searches, 2 pages read" },
  standard: { label: "Standard", searches: 3, fetches: 3, hint: "3 searches, 3 pages read" },
  deep: { label: "Deep", searches: 4, fetches: 4, hint: "4 searches, 4 pages read" },
} as const;
export type Depth = keyof typeof DEPTHS;
export const DEPTH_KEYS = Object.keys(DEPTHS) as Depth[];

export const SOURCE_CATEGORY_LABEL: Record<string, string> = {
  forum: "Forum or community",
  review_site: "Review site",
  marketplace: "Marketplace",
  video: "Video",
  social: "Social media",
  news: "News or publication",
  brand_site: "Brand website",
  website: "Website",
};

export const ACCESS_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  read: { label: "Read", className: "border-[#9fd89f] bg-[#f1faf1] text-[#0e700e]" },
  search_result: { label: "Search result only", className: "border-line-strong bg-surface text-muted" },
  failed: { label: "Could not be read", className: "border-[#f1bbbc] bg-[#fdf3f4] text-danger" },
};

export const COMPETITOR_KIND_LABEL: Record<string, string> = {
  direct: "Direct competitor",
  indirect: "Indirect competitor",
  alternative: "Alternative solution",
};

/** The product-research sections, in display order. */
export const PRODUCT_SECTIONS = [
  ["features", "Product features"],
  ["functional_benefits", "Functional benefits"],
  ["emotional_benefits", "Emotional benefits"],
  ["usps", "Unique selling propositions"],
  ["unique_mechanism", "Unique mechanism"],
  ["differentiation", "Differentiation"],
  ["reasons_to_believe", "Reasons to believe"],
  ["positioning", "Existing positioning"],
  ["target_audience", "Target audience"],
  ["use_cases", "Use cases"],
  ["purchase_motivations", "Purchase motivations"],
  ["objections", "Potential objections"],
  ["limitations", "Product limitations"],
  ["offers", "Existing offers"],
  ["pricing", "Pricing strategy"],
  ["competitive_advantages", "Competitive advantages"],
] as const;

/** The competitor-profile sections, in display order. */
export const COMPETITOR_SECTIONS = [
  ["product_range", "Product range"],
  ["target_audience", "Target audience"],
  ["value_propositions", "Main value propositions"],
  ["usps", "Unique selling propositions"],
  ["pricing", "Pricing"],
  ["offers", "Offers"],
  ["advertising_messages", "Advertising messages"],
  ["marketing_angles", "Marketing angles"],
  ["creative_formats", "Creative formats"],
  ["objections_addressed", "Customer objections addressed"],
  ["strengths", "Strengths"],
  ["weaknesses", "Weaknesses"],
  ["differentiation_opportunities", "Differentiation opportunities"],
] as const;

/** Country names as typed in a project → ISO codes, for search location and Ad Library links. */
const COUNTRY_CODES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  america: "US",
  canada: "CA",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  england: "GB",
  ireland: "IE",
  australia: "AU",
  "new zealand": "NZ",
  georgia: "GE",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  mexico: "MX",
  brazil: "BR",
  india: "IN",
};

export function countryCode(countries: string[]): string | null {
  const first = countries[0]?.trim();
  if (!first) return null;
  if (/^[a-z]{2}$/i.test(first)) return first.toUpperCase();
  return COUNTRY_CODES[first.toLowerCase()] ?? null;
}

/** Meta Ad Library, searched for a name: opened by you in the browser, never scraped. */
export function adLibraryUrl(name: string, country: string | null): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: country ?? "ALL",
    q: name,
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/* Choices offered in the authorization dialog, shared by the research pages. */

export function depthChoice(allowNone: boolean) {
  return {
    name: "depth",
    label: "Web research",
    defaultValue: allowNone ? "quick" : "standard",
    options: [
      ...(allowNone ? [{ value: "none", label: "Off", hint: "No web access: only your material is used. Cheapest." }] : []),
      ...DEPTH_KEYS.map((key) => ({ value: key, label: DEPTHS[key].label, hint: `${DEPTHS[key].hint}. Caps are enforced by the API.` })),
    ],
  };
}

export const KNOWLEDGE_CHOICE = {
  name: "knowledge",
  label: "Knowledge base",
  defaultValue: "on",
  options: [
    { value: "on", label: "Include relevant items", hint: "The matching items are listed by name before you authorize." },
    { value: "off", label: "Leave out" },
  ],
};
