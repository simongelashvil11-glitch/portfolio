import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { CosVideoPlan } from "@/db/creative-os";

import { VIDEO_TOOLS, type VideoTool } from "./creative-labels";
import type { StoredVideoPlan } from "./research/creative";

/*
 * An AI video plan as a file: Markdown or Word, with every shot's prompt
 * ready to paste. Built from what is saved; no AI call.
 */

const NL = "\n";

function parts(plan: CosVideoPlan) {
  const data = plan.result as StoredVideoPlan;
  const tool = VIDEO_TOOLS[plan.tool as VideoTool];
  const head = [
    `Make it in: ${tool?.label ?? plan.tool}${tool ? ` (${tool.url})` : ""}`,
    `Aspect ratio: ${plan.aspect}`,
    data.settings ? `Settings: ${data.settings}` : null,
    data.tool_reason,
  ]
    .filter(Boolean)
    .join(NL);
  const shots = data.shots.map((shot, index) => ({
    title: `Shot ${index + 1}: ${shot.shot} (~${shot.duration_seconds}s)`,
    prompt: shot.prompt,
    lines: (
      [
        ["Purpose", shot.purpose],
        ["Negative prompt", shot.negative_prompt],
        ["Camera", shot.camera],
        ["Audio", shot.audio],
        ["Voiceover", shot.voiceover],
        ["On-screen text (add in editing)", shot.on_screen_text],
        ["Reference images", shot.reference_images],
        ["Continuity", shot.continuity],
      ] as [string, string][]
    ).filter(([, value]) => value && value.trim()),
  }));
  return { data, head, shots };
}

export function videoMarkdown(plan: CosVideoPlan) {
  const { data, head, shots } = parts(plan);
  const fence = "```";
  const sections = [
    `# ${plan.title}`,
    head,
    data.alternatives.length ? `## Alternatives${NL}${NL}${data.alternatives.map((item) => `- ${item}`).join(NL)}` : "",
    `## Style${NL}${NL}${data.style_bible}`,
    data.characters.length ? `## Characters${NL}${NL}${data.characters.map((item) => `- **${item.name}:** ${item.description}`).join(NL)}` : "",
    `## Keeping the product accurate${NL}${NL}${data.product_reference}`,
    data.avatar_script ? `## Script for the AI presenter${NL}${NL}${data.avatar_script}` : "",
    `## Shots`,
    ...shots.map(
      (shot) =>
        `### ${shot.title}${NL}${NL}**Prompt:**${NL}${NL}${fence}${NL}${shot.prompt}${NL}${fence}${NL}${NL}${shot.lines
          .map(([label, value]) => `**${label}:** ${value}`)
          .join(NL + NL)}`,
    ),
    `## Voiceover${NL}${NL}${data.voiceover_plan}${data.music ? `${NL}${NL}Music: ${data.music}` : ""}`,
    `## Putting it together${NL}${NL}${data.assembly.map((step, index) => `${index + 1}. ${step}`).join(NL)}`,
    `## Compliance${NL}${NL}${data.compliance.map((item) => `- ${item}`).join(NL)}`,
    `## Generations and cost${NL}${NL}${data.cost_and_time}`,
  ];
  return sections.filter(Boolean).join(NL + NL) + NL;
}

const text = (value: string, options: { bold?: boolean; italic?: boolean; font?: string } = {}) =>
  new Paragraph({
    children: value.split(NL).map((line, index) => new TextRun({ text: line, break: index ? 1 : 0, ...options })),
    spacing: { after: 120 },
  });

export async function videoDocx(plan: CosVideoPlan) {
  const { data, head, shots } = parts(plan);
  const children: Paragraph[] = [new Paragraph({ text: plan.title, heading: HeadingLevel.TITLE }), text(head)];
  const heading = (value: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
    children.push(new Paragraph({ text: value, heading: level }));
  const block = (title: string, body: string) => {
    if (!body.trim()) return;
    heading(title);
    children.push(text(body));
  };
  const list = (title: string, items: string[], numbered = false) => {
    if (!items.length) return;
    heading(title);
    items.forEach((item, index) => children.push(numbered ? text(`${index + 1}. ${item}`) : new Paragraph({ text: item, bullet: { level: 0 } })));
  };

  list("Alternatives", data.alternatives);
  block("Style", data.style_bible);
  list("Characters", data.characters.map((item) => `${item.name}: ${item.description}`));
  block("Keeping the product accurate", data.product_reference);
  block("Script for the AI presenter", data.avatar_script);
  heading("Shots", HeadingLevel.HEADING_1);
  for (const shot of shots) {
    heading(shot.title, HeadingLevel.HEADING_3);
    children.push(new Paragraph({ children: [new TextRun({ text: "Prompt", bold: true })] }), text(shot.prompt, { font: "Consolas" }));
    for (const [label, value] of shot.lines) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })], spacing: { after: 100 } }));
    }
  }
  block("Voiceover", `${data.voiceover_plan}${data.music ? `${NL}${NL}Music: ${data.music}` : ""}`);
  list("Putting it together", data.assembly, true);
  list("Compliance", data.compliance);
  block("Generations and cost", data.cost_and_time);
  return Packer.toBuffer(new Document({ creator: "CreativeOS", title: plan.title, sections: [{ children }] }));
}
