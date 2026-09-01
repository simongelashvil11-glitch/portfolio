import { Fragment } from "react";

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

/**
 * A deliberately small subset of Markdown: `##`/`###` headings, `-` bullet
 * lists, and blank-line-separated paragraphs. Enough for portfolio writing
 * without pulling in a parser, and it never renders raw HTML.
 */
function parse(source: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of source.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const heading = /^(#{2,3})\s+(.*)$/.exec(chunk);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const linesInChunk = chunk.split("\n").map((line) => line.trim());
    if (linesInChunk.every((line) => line.startsWith("- "))) {
      blocks.push({ kind: "list", items: linesInChunk.map((line) => line.slice(2).trim()) });
      continue;
    }

    blocks.push({ kind: "paragraph", text: chunk });
  }

  return blocks;
}

export function Prose({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div className="grid gap-5">
      {blocks.map((block, index) => (
        <Fragment key={index}>
          {block.kind === "heading" && block.level === 2 ? (
            <h2 className="mt-6 font-display text-2xl tracking-display">{block.text}</h2>
          ) : null}

          {block.kind === "heading" && block.level === 3 ? (
            <h3 className="mt-4 text-lg font-medium">{block.text}</h3>
          ) : null}

          {block.kind === "list" ? (
            <ul className="grid gap-2">
              {block.items.map((item) => (
                <li
                  key={item}
                  className="relative pl-4 leading-relaxed text-muted before:absolute before:left-0 before:top-3 before:size-1 before:rounded-full before:bg-accent"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {block.kind === "paragraph" ? (
            <p className="leading-relaxed text-muted">{block.text}</p>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
