import "server-only";

import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { CosBrief, CosScript } from "@/db/creative-os";

import { BRIEF_AUDIENCES, COPY_KINDS, type CopyKind } from "./creative-labels";
import { spokenSeconds } from "./format";
import type { StoredBrief } from "./research/creative";

/*
 * Scripts and briefs as files to send: Word (.docx), Markdown and plain
 * text. Built from what is saved; no AI call.
 */

export function fileSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "creativeos";
}

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

function scriptFacts(script: CosScript) {
  const kind = COPY_KINDS[script.kind as CopyKind];
  const spoken = script.working.map((section) => section.text).join(" ");
  return [
    kind?.label ?? script.kind,
    script.platform,
    script.language,
    kind?.video ? `about ${spokenSeconds(spoken)} seconds spoken` : `${spoken.trim().split(/\s+/).filter(Boolean).length} words`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function scriptMarkdown(script: CosScript) {
  const video = COPY_KINDS[script.kind as CopyKind]?.video;
  const body = script.working
    .map((section) => `## ${section.label}\n\n${section.text.trim() || "_(empty)_"}${section.direction.trim() ? `\n\n> ${video ? "On screen" : "Note"}: ${section.direction.trim()}` : ""}`)
    .join("\n\n");
  return `# ${script.title}\n\n${scriptFacts(script)}\n\n${body}\n`;
}

export function scriptText(script: CosScript) {
  const video = COPY_KINDS[script.kind as CopyKind]?.video;
  return `${script.title}\n${scriptFacts(script)}\n\n${script.working
    .map((section) => [section.label.toUpperCase(), section.text.trim(), section.direction.trim() ? `${video ? "On screen" : "Note"}: ${section.direction.trim()}` : ""].filter(Boolean).join("\n"))
    .join("\n\n")}\n`;
}

const para = (text: string, options: { bold?: boolean; italic?: boolean; size?: number; color?: string } = {}) =>
  new Paragraph({ children: text.split("\n").flatMap((line, index) => [new TextRun({ text: line, break: index ? 1 : 0, ...options })]), spacing: { after: 120 } });

export async function scriptDocx(script: CosScript) {
  const video = COPY_KINDS[script.kind as CopyKind]?.video;
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: script.title, heading: HeadingLevel.TITLE }),
    para(scriptFacts(script), { color: "616161", size: 20 }),
  ];
  for (const section of script.working) {
    children.push(new Paragraph({ text: section.label, heading: HeadingLevel.HEADING_2 }));
    children.push(para(section.text.trim() || "(empty)"));
    if (section.direction.trim()) children.push(para(`${video ? "On screen" : "Note"}: ${section.direction.trim()}`, { italic: true, color: "616161", size: 20 }));
  }
  return Packer.toBuffer(new Document({ creator: "CreativeOS", title: script.title, sections: [{ children }] }));
}

/* ------------------------------------------------------------------ */
/* Briefs                                                              */
/* ------------------------------------------------------------------ */

const LIST_FIELDS: [keyof StoredBrief, string][] = [
  ["on_screen_text", "On-screen text"],
  ["shot_list", "Shot list"],
  ["broll", "B-roll"],
  ["required_assets", "Required assets"],
  ["compliance_considerations", "Compliance: do not say or show"],
  ["alternative_hooks", "Alternative hooks to film"],
];

const TEXT_FIELDS: [keyof StoredBrief, string][] = [
  ["concept", "Creative concept"],
  ["objective", "Campaign objective"],
  ["target_audience", "Target audience"],
  ["awareness_stage", "Awareness stage"],
  ["angle", "Marketing angle"],
  ["core_message", "Core message"],
  ["hook", "Hook"],
  ["visual_direction", "Visual direction"],
  ["product_placement", "Product placement"],
  ["editing_instructions", "Editing instructions"],
  ["pacing", "Pacing"],
  ["music_direction", "Music direction"],
  ["cta", "Call to action"],
];

export function briefMarkdown(brief: CosBrief) {
  const data = brief.result as StoredBrief;
  const audience = BRIEF_AUDIENCES[brief.audience as keyof typeof BRIEF_AUDIENCES] ?? brief.audience;
  const text = TEXT_FIELDS.map(([key, label]) => (data[key] ? `**${label}:** ${String(data[key])}` : null)).filter(Boolean).join("\n\n");
  const lists = LIST_FIELDS.map(([key, label]) => {
    const items = (data[key] as string[]) ?? [];
    return items.length ? `## ${label}\n\n${items.map((item) => `- ${item}`).join("\n")}` : null;
  })
    .filter(Boolean)
    .join("\n\n");
  const storyboard = data.storyboard.length
    ? `## Storyboard (timings are estimates)\n\n| # | Scene | Time | Voiceover | Visual | On-screen text | Editing | Purpose |\n|---|---|---|---|---|---|---|---|\n${data.storyboard
        .map((scene, index) =>
          [index + 1, scene.scene, `~${scene.duration_seconds}s`, scene.voiceover, scene.visual, scene.on_screen_text, scene.editing_notes, scene.purpose]
            .map((cell) => String(cell).replace(/\|/g, "/").replace(/\n/g, " "))
            .join(" | "),
        )
        .map((row) => `| ${row} |`)
        .join("\n")}`
    : "";
  return `# ${brief.title}\n\nBrief for: ${audience}\n\n${text}\n\n## Voiceover\n\n${data.voiceover}\n\n${storyboard}\n\n${lists}\n`;
}

const cell = (text: string, bold = false) =>
  new TableCell({
    children: [para(text || "—", { bold, size: 18 })],
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });

export async function briefDocx(brief: CosBrief) {
  const data = brief.result as StoredBrief;
  const audience = BRIEF_AUDIENCES[brief.audience as keyof typeof BRIEF_AUDIENCES] ?? brief.audience;
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: brief.title, heading: HeadingLevel.TITLE }),
    para(`Production brief for: ${audience}`, { color: "616161" }),
  ];
  for (const [key, label] of TEXT_FIELDS) {
    if (!data[key]) continue;
    children.push(new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: String(data[key]) })], spacing: { after: 120 } }));
  }
  children.push(new Paragraph({ text: "Voiceover", heading: HeadingLevel.HEADING_2 }), para(data.voiceover));

  if (data.storyboard.length) {
    children.push(new Paragraph({ text: "Storyboard", heading: HeadingLevel.HEADING_2 }), para("Timings are estimates.", { italic: true, color: "616161", size: 18 }));
    const head = ["#", "Scene", "Time", "Voiceover", "Visual", "On-screen text", "Editing", "Purpose"];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D1" },
        },
        rows: [
          new TableRow({ tableHeader: true, children: head.map((text) => cell(text, true)) }),
          ...data.storyboard.map(
            (scene, index) =>
              new TableRow({
                children: [
                  cell(String(index + 1)),
                  cell(scene.scene),
                  cell(`~${scene.duration_seconds}s`),
                  cell(scene.voiceover),
                  cell(scene.visual),
                  cell(scene.on_screen_text),
                  cell(scene.editing_notes),
                  cell(scene.purpose),
                ],
              }),
          ),
        ],
      }),
    );
  }

  for (const [key, label] of LIST_FIELDS) {
    const items = (data[key] as string[]) ?? [];
    if (!items.length) continue;
    children.push(new Paragraph({ text: label, heading: HeadingLevel.HEADING_2 }));
    for (const item of items) children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
  }
  children.push(para("Made with CreativeOS.", { italic: true, color: "9E9E9E", size: 16 }));

  return Packer.toBuffer(
    new Document({
      creator: "CreativeOS",
      title: brief.title,
      // Landscape, so the storyboard table has room.
      sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } }, children }],
    }),
  );
}

