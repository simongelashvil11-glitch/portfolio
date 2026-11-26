import type { CosAd, CosAdAnalysis, CosAdSegment } from "@/db/creative-os";

import type { AnalysisOutput } from "./deconstruct";
import { AWARENESS_LABEL, ELEMENT_STYLE, type Element } from "./elements";

/* Exports built from saved work only: no AI call, no cost. */

const label = (element: string) => ELEMENT_STYLE[element as Element]?.label ?? element;

export type StoredOverview = Pick<AnalysisOutput, "overview" | "checklist" | "limitations">;

export function analysisMarkdown(ad: CosAd, analysis: CosAdAnalysis, segments: CosAdSegment[]): string {
  const { overview, checklist, limitations } = analysis.overview as StoredOverview;
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- (none)");
  const lines = [
    `# Ad deconstruction: ${ad.title}`,
    "",
    [ad.advertiser && `Advertiser: ${ad.advertiser}`, ad.platform && `Platform: ${ad.platform}`, ad.format && `Format: ${ad.format}`]
      .filter(Boolean)
      .join(" · "),
    `Analysed ${analysis.createdAt.toISOString().slice(0, 10)} with ${analysis.model}.`,
    ad.sourceUrl ? `Source: ${ad.sourceUrl}` : "",
    "",
    "## Overview",
    "",
    ...[
      `- **Opening hook:** ${overview.opening_hook}`,
      `- **Hook type:** ${overview.hook_type}`,
      overview.pattern_interrupt ? `- **Pattern interrupt:** ${overview.pattern_interrupt}` : null,
      `- **Target audience (hypothesis):** ${overview.target_audience_hypothesis}`,
      `- **Awareness stage:** ${AWARENESS_LABEL[overview.awareness_stage]} — ${overview.awareness_reasoning}`,
      `- **Market sophistication:** ${overview.market_sophistication} — ${overview.sophistication_reasoning}`,
      overview.offer ? `- **Offer:** ${overview.offer}` : null,
      overview.cta ? `- **Call to action:** ${overview.cta}` : null,
    ].filter((line): line is string => line !== null),
    "",
    `**Structure:** ${overview.structure_summary}`,
    "",
    "**Persuasive techniques**",
    list(overview.persuasive_techniques),
    "",
    "**Strengths**",
    list(overview.strengths),
    "",
    "**Weaknesses**",
    list(overview.weaknesses),
    "",
    "**Top improvements**",
    list(overview.top_improvements),
    "",
    "## Segment by segment",
    "",
    ...segments.flatMap((segment, index) => [
      `### ${index + 1}. ${label(segment.element)} (${segment.source})`,
      "",
      `> ${segment.originalText.replace(/\n/g, "\n> ")}`,
      segment.startChar === null ? "\n_Not found word for word in the source; check before quoting._" : "",
      "",
      `- **Purpose:** ${segment.strategicPurpose}`,
      `- **Principle:** ${segment.psychologicalPrinciple}`,
      `- **Strengths:** ${segment.strengths}`,
      `- **Weaknesses:** ${segment.weaknesses}`,
      `- **Improvement:** ${segment.improvement}`,
      "",
    ]),
    "## Direct-response checklist",
    "",
    "| Element | Present | Note |",
    "| --- | --- | --- |",
    ...checklist.map((item) => `| ${label(item.element)} | ${item.present ? "Yes" : "No"} | ${item.note.replace(/\|/g, "\\|")} |`),
    "",
    "## Limitations",
    "",
    list(limitations),
    "",
    "_Scores and judgements here are strategic opinions, not predictions of how the ad performs._",
    "",
  ];
  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}
