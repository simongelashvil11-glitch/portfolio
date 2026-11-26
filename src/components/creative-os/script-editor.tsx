"use client";

import { useEffect, useRef, useState } from "react";

import { autosaveScript } from "@/actions/creative-os-writing";
import type { ScriptSection } from "@/db/creative-os";
import { ArrowDown, ArrowUp, Copy, Delete } from "@/components/fluent-icons";
import { spokenSeconds } from "@/lib/creative-os/format";
import { cn } from "@/lib/utils";

/*
 * The script editor. Every change is saved on its own a moment after you
 * stop typing (and when you leave a field), straight to the database: no AI
 * is involved. Saving a named version, and AI rewrites, happen outside it.
 */

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function scriptAsText(sections: ScriptSection[], video: boolean) {
  return sections
    .filter((section) => section.text.trim() || section.direction.trim())
    .map((section) => [section.label.toUpperCase(), section.text.trim(), section.direction.trim() ? `${video ? "On screen" : "Note"}: ${section.direction.trim()}` : ""].filter(Boolean).join("\n"))
    .join("\n\n");
}

export function ScriptEditor({ scriptId, initial, video }: { scriptId: number; initial: ScriptSection[]; video: boolean }) {
  const [sections, setSections] = useState<ScriptSection[]>(initial.length ? initial : [{ label: "Section", text: "", direction: "" }]);
  const [state, setState] = useState<{ kind: "saved" | "saving" | "dirty" | "error"; text?: string }>({ kind: "saved" });
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const latest = useRef(sections);

  async function save(next: ScriptSection[]) {
    setState({ kind: "saving" });
    const result = await autosaveScript(scriptId, next).catch(() => ({ ok: false, error: "Could not reach the server." }) as const);
    if (latest.current !== next) return; // a newer change is on its way
    setState(result.ok ? { kind: "saved", text: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } : { kind: "error", text: result.error });
  }

  function change(next: ScriptSection[]) {
    latest.current = next;
    setSections(next);
    setState({ kind: "dirty" });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(next), 1200);
  }

  function flush() {
    if (state.kind !== "dirty") return;
    if (timer.current) window.clearTimeout(timer.current);
    void save(latest.current);
  }

  // Warn before leaving with a change not yet saved.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state.kind === "dirty" || state.kind === "saving") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.kind]);

  const update = (index: number, patch: Partial<ScriptSection>) => change(sections.map((section, at) => (at === index ? { ...section, ...patch } : section)));
  const move = (index: number, by: number) => {
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    change(next);
  };

  const allText = sections.map((section) => section.text).join(" ");
  const totalWords = words(allText);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-semibold">
          {totalWords} words{video ? ` · about ${spokenSeconds(allText)} seconds spoken` : ""}
        </span>
        <span
          role="status"
          className={cn("text-xs", state.kind === "error" ? "text-danger" : state.kind === "saved" ? "text-[#0e700e]" : "text-faint")}
        >
          {state.kind === "saving" ? "Saving…" : state.kind === "dirty" ? "Unsaved changes" : state.kind === "error" ? `Not saved: ${state.text}` : state.text ? `Saved ${state.text}` : "All changes saved"}
        </span>
        <button
          type="button"
          className="btn btn-secondary ml-auto"
          onClick={() => {
            void navigator.clipboard.writeText(scriptAsText(sections, video)).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Copy />
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>

      <ol className="grid gap-3">
        {sections.map((section, index) => (
          <li key={index} className="card grid gap-2 p-4">
            <div className="flex items-center gap-2">
              <span className="tnum text-xs font-semibold text-faint">{index + 1}</span>
              <input
                value={section.label}
                onChange={(event) => update(index, { label: event.target.value })}
                onBlur={flush}
                aria-label="Section name"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold uppercase tracking-wide text-muted outline-none focus:text-foreground"
              />
              <span className="text-xs text-faint">
                {words(section.text)} w{video && section.text.trim() ? ` · ~${spokenSeconds(section.text)} s` : ""}
              </span>
              <button type="button" className="btn btn-subtle btn-icon !min-h-7 !min-w-7" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp />
              </button>
              <button
                type="button"
                className="btn btn-subtle btn-icon !min-h-7 !min-w-7"
                aria-label="Move down"
                disabled={index === sections.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </button>
              <button
                type="button"
                className="btn btn-subtle btn-icon !min-h-7 !min-w-7 text-faint hover:!text-danger"
                aria-label="Remove section"
                disabled={sections.length === 1}
                onClick={() => {
                  if (!section.text.trim() || window.confirm(`Remove “${section.label}”?`)) change(sections.filter((_, at) => at !== index));
                }}
              >
                <Delete />
              </button>
            </div>
            <textarea
              value={section.text}
              onChange={(event) => update(index, { text: event.target.value })}
              onBlur={flush}
              rows={Math.min(14, Math.max(2, Math.ceil(section.text.length / 85) + section.text.split("\n").length - 1))}
              placeholder={video ? "What is said" : "The copy"}
              className="field resize-y text-[15px] leading-6"
              aria-label={`${section.label}: text`}
            />
            <textarea
              value={section.direction}
              onChange={(event) => update(index, { direction: event.target.value })}
              onBlur={flush}
              rows={1}
              placeholder={video ? "On screen: visuals, on-screen text, action" : "Note (layout, emphasis)"}
              className="field resize-y text-xs text-muted"
              aria-label={`${section.label}: ${video ? "on-screen direction" : "note"}`}
            />
          </li>
        ))}
      </ol>
      <div>
        <button type="button" className="btn btn-secondary" onClick={() => change([...sections, { label: "New section", text: "", direction: "" }])}>
          Add a section
        </button>
      </div>
    </div>
  );
}
