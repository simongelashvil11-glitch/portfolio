"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Input, Textarea } from "@/components/admin/ui";
import type { ProjectPress } from "@/db/schema";

type Card = ProjectPress & { key: number };

let nextKey = 0;

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

const blank: ProjectPress = { outlet: "", date: "", title: "", originalTitle: "", summary: "", url: "", image: "" };

/** Small caption above each input; these sit inside a card, not a Field. */
function Caption({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-faint">{children}</span>;
}

/** Articles about the project, one card each, posted as one JSON field. */
export function PressEditor({ press, error }: { press: ProjectPress[]; error?: string }) {
  const [cards, setCards] = useState<Card[]>(() => press.map((item) => ({ ...blank, ...item, key: nextKey++ })));

  const update = (key: number, patch: Partial<ProjectPress>) =>
    setCards((current) => current.map((card) => (card.key === key ? { ...card, ...patch } : card)));

  const move = (index: number, by: -1 | 1) =>
    setCards((current) => {
      const next = [...current];
      const [card] = next.splice(index, 1);
      next.splice(index + by, 0, card);
      return next;
    });

  const payload = JSON.stringify(
    cards.map(({ outlet, date, title, originalTitle, summary, url, image }) => ({
      outlet,
      date,
      title,
      originalTitle,
      summary,
      url,
      image,
    })),
  );

  return (
    <div className="grid gap-3">
      <input type="hidden" name="press" value={payload} />

      {cards.map((card, index) => (
        <div key={card.key} className="grid gap-3 rounded-lg border border-line bg-surface p-3">
          <div className="flex items-end gap-2">
            <label className="grid flex-1 gap-1">
              <Caption>Publication</Caption>
              <Input
                value={card.outlet}
                onChange={(e) => update(card.key, { outlet: e.target.value })}
                placeholder="Entrepreneur Georgia"
                className="bg-background"
              />
            </label>
            <label className="grid w-40 gap-1">
              <Caption>Date</Caption>
              <Input
                value={card.date}
                onChange={(e) => update(card.key, { date: e.target.value })}
                placeholder="December 2021"
                className="bg-background"
              />
            </label>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move article up" className={iconButton}>
                <ArrowUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === cards.length - 1}
                aria-label="Move article down"
                className={iconButton}
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCards((current) => current.filter((c) => c.key !== card.key))}
                aria-label="Remove article"
                className={`${iconButton} hover:text-danger`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <label className="grid gap-1">
            <Caption>Headline, as it should read here (translated if needed)</Caption>
            <Input
              value={card.title}
              onChange={(e) => update(card.key, { title: e.target.value })}
              className="bg-background font-semibold"
            />
          </label>
          <label className="grid gap-1">
            <Caption>Original headline (optional — shown beneath when it differs)</Caption>
            <Input
              value={card.originalTitle}
              onChange={(e) => update(card.key, { originalTitle: e.target.value })}
              className="bg-background"
            />
          </label>
          <label className="grid gap-1">
            <Caption>Summary (optional, a sentence or two)</Caption>
            <Textarea
              rows={3}
              value={card.summary}
              onChange={(e) => update(card.key, { summary: e.target.value })}
              className="bg-background"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <Caption>Article link</Caption>
              <Input
                type="url"
                value={card.url}
                onChange={(e) => update(card.key, { url: e.target.value })}
                placeholder="https://..."
                className="bg-background"
              />
            </label>
            <label className="grid gap-1">
              <Caption>Photo (URL or /path, optional)</Caption>
              <Input
                value={card.image}
                onChange={(e) => update(card.key, { image: e.target.value })}
                placeholder="/press/photo.jpg"
                className="bg-background"
              />
            </label>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => setCards((current) => [...current, { ...blank, key: nextKey++ }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          <Plus className="size-4" />
          Add article
        </button>
      </div>

      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </div>
  );
}
