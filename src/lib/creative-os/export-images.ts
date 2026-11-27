import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { CosImagePlan } from "@/db/creative-os";

import { IMAGE_FORMATS, IMAGE_TOOLS, type ImageFormat, type ImageTool } from "./creative-labels";
import type { StoredImagePlan } from "./research/creative";

/*
 * An AI image plan as a file: Markdown or Word, with every concept's prompt
 * and text ready to paste. Built from what is saved; no AI call.
 */

const NL = "\n";

function parts(plan: CosImagePlan) {
  const data = plan.result as StoredImagePlan;
  const tool = IMAGE_TOOLS[plan.tool as ImageTool];
  const format = IMAGE_FORMATS[plan.format as ImageFormat];
  const head = [
    `Make it in: ${tool?.label ?? plan.tool}${tool ? ` (${tool.url})` : ""}`,
    `For: ${format?.label ?? plan.format}${format ? `, export at ${format.size}` : ""}`,
    data.tool_reason,
  ].join(NL);
  const concepts = data.concepts.map((concept, index) => ({
    title: `Concept ${index + 1}: ${concept.name} (${concept.format})`,
    prompt: concept.prompt,
    lines: (
      [
        ["Idea", concept.idea],
        ["Negative prompt", concept.negative_prompt],
        ["Text the tool renders in the image", concept.text_in_image],
        ["Text to add in a design tool", concept.text_overlay],
        ["Layout", concept.layout],
        ["Reference images", concept.reference_images],
        ["Finishing", concept.finishing],
        ["Variations to test", concept.variations.join("; ")],
      ] as [string, string][]
    ).filter(([, value]) => value && value.trim()),
  }));
  return { data, head, concepts };
}

export function imagesMarkdown(plan: CosImagePlan) {
  const { data, head, concepts } = parts(plan);
  const fence = "```";
  const sections = [
    `# ${plan.title}`,
    head,
    data.alternatives.length ? `## Alternatives${NL}${NL}${data.alternatives.map((item) => `- ${item}`).join(NL)}` : "",
    `## Style${NL}${NL}${data.style_bible}`,
    `## Keeping the product accurate${NL}${NL}${data.product_reference}`,
    `## Concepts`,
    ...concepts.map(
      (concept) =>
        `### ${concept.title}${NL}${NL}**Prompt:**${NL}${NL}${fence}${NL}${concept.prompt}${NL}${fence}${NL}${NL}${concept.lines
          .map(([label, value]) => `**${label}:** ${value}`)
          .join(NL + NL)}`,
    ),
    `## On the website${NL}${NL}${data.website_use}`,
    `## Compliance${NL}${NL}${data.compliance.map((item) => `- ${item}`).join(NL)}`,
    `## Generations and cost${NL}${NL}${data.cost_and_time}`,
  ];
  return sections.filter(Boolean).join(NL + NL) + NL;
}

const text = (value: string, options: { font?: string } = {}) =>
  new Paragraph({
    children: value.split(NL).map((line, index) => new TextRun({ text: line, break: index ? 1 : 0, ...options })),
    spacing: { after: 120 },
  });

export async function imagesDocx(plan: CosImagePlan) {
  const { data, head, concepts } = parts(plan);
  const children: Paragraph[] = [new Paragraph({ text: plan.title, heading: HeadingLevel.TITLE }), text(head)];
  const heading = (value: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
    children.push(new Paragraph({ text: value, heading: level }));
  const block = (title: string, body: string) => {
    if (!body.trim()) return;
    heading(title);
    children.push(text(body));
  };
  if (data.alternatives.length) {
    heading("Alternatives");
    data.alternatives.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
  }
  block("Style", data.style_bible);
  block("Keeping the product accurate", data.product_reference);
  heading("Concepts", HeadingLevel.HEADING_1);
  for (const concept of concepts) {
    heading(concept.title, HeadingLevel.HEADING_3);
    children.push(new Paragraph({ children: [new TextRun({ text: "Prompt", bold: true })] }), text(concept.prompt, { font: "Consolas" }));
    for (const [label, value] of concept.lines) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })], spacing: { after: 100 } }));
    }
  }
  block("On the website", data.website_use);
  if (data.compliance.length) {
    heading("Compliance");
    data.compliance.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
  }
  block("Generations and cost", data.cost_and_time);
  return Packer.toBuffer(new Document({ creator: "CreativeOS", title: plan.title, sections: [{ children }] }));
}
