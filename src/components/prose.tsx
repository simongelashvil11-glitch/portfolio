import { Fragment } from "react";

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "divider" }
  | { kind: "paragraph"; text: string };

/**
 * A deliberately small subset of Markdown: `##`/`###` headings, `-` bullet
 * lists, `---` dividers, and blank-line-separated paragraphs. Enough for
 * portfolio writing without pulling in a parser, and it never renders raw
 * HTML.
 *
 * A single newline inside a paragraph becomes a line break rather than being
 * collapsed. Strict Markdown swallows it, which surprises anyone who presses
 * Enter once and expects the line to end — and the result is a wall of text.
 */
/** `-`, `*` or `•` — whichever the author's editor produced. */
const BULLET = /^[-*•]\s+/;

function parse(source: string): Block[] {
  const blocks: Block[] = [];

  // Text pasted from Windows editors carries CRLF. Splitting on /\n{2,}/
  // would never match those, because each pair has a \r wedged between the
  // newlines — so every blank line was ignored and the whole entry rendered
  // as one unbroken paragraph.
  const normalised = source.replace(/\r\n?/g, "\n");

  for (const raw of normalised.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk) continue;

    if (/^-{3,}$/.test(chunk)) {
      blocks.push({ kind: "divider" });
      continue;
    }

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
    const firstBullet = linesInChunk.findIndex((line) => BULLET.test(line));

    // A list, optionally introduced by a line or two of ordinary text —
    // people write "I did the following:" and then start bulleting, without
    // leaving a blank line in between.
    if (firstBullet !== -1 && linesInChunk.slice(firstBullet).every((line) => BULLET.test(line))) {
      const leadIn = linesInChunk.slice(0, firstBullet).join("\n").trim();
      if (leadIn) blocks.push({ kind: "paragraph", text: leadIn });

      blocks.push({
        kind: "list",
        items: linesInChunk.slice(firstBullet).map((line) => line.replace(BULLET, "").trim()),
      });
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

          {block.kind === "divider" ? (
            <hr className="my-4 border-0 border-t border-line" />
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
            <p className="leading-relaxed text-muted">
              {block.text.split("\n").map((line, lineIndex, lines) => (
                <Fragment key={lineIndex}>
                  {line}
                  {lineIndex < lines.length - 1 ? <br /> : null}
                </Fragment>
              ))}
            </p>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
