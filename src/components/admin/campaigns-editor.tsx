"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/admin/ui";
import type { ProjectCampaign } from "@/db/schema";

type Figure = { key: number; label: string; value: string };
type Card = { key: number; tag: string; name: string; figures: Figure[] };

let nextKey = 0;
const key = () => nextKey++;

const toCard = (campaign: ProjectCampaign): Card => ({
  key: key(),
  tag: campaign.tag,
  name: campaign.name,
  figures: campaign.figures.map((figure) => ({ key: key(), ...figure })),
});

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

function moved<T>(list: T[], index: number, by: -1 | 1) {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}

/**
 * The campaign cards in a project's statistics window. Like the stats
 * editor, everything travels as one JSON field in the order shown.
 */
export function CampaignsEditor({ campaigns, error }: { campaigns: ProjectCampaign[]; error?: string }) {
  const [cards, setCards] = useState<Card[]>(() => campaigns.map(toCard));

  const updateCard = (cardKey: number, patch: (card: Card) => Card) =>
    setCards((current) => current.map((card) => (card.key === cardKey ? patch(card) : card)));

  const payload = JSON.stringify(
    cards.map(({ tag, name, figures }) => ({
      tag,
      name,
      figures: figures.map(({ label, value }) => ({ label, value })),
    })),
  );

  return (
    <div className="grid gap-3">
      <input type="hidden" name="campaigns" value={payload} />

      {cards.map((card, index) => (
        <div key={card.key} className="grid gap-3 rounded-lg border border-line bg-surface p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2">
              <Input
                aria-label="Label line"
                placeholder="Messaging · highest volume"
                value={card.tag}
                onChange={(event) => updateCard(card.key, (c) => ({ ...c, tag: event.target.value }))}
                className="bg-background text-xs"
              />
              <Input
                aria-label="Campaign name"
                placeholder="Campaign name"
                value={card.name}
                onChange={(event) => updateCard(card.key, (c) => ({ ...c, name: event.target.value }))}
                className="bg-background font-semibold"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCards((current) => moved(current, index, -1))}
                disabled={index === 0}
                aria-label="Move campaign up"
                className={iconButton}
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCards((current) => moved(current, index, 1))}
                disabled={index === cards.length - 1}
                aria-label="Move campaign down"
                className={iconButton}
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCards((current) => current.filter((c) => c.key !== card.key))}
                aria-label="Remove campaign"
                className={`${iconButton} hover:text-danger`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <ol className="grid gap-1.5 pl-3">
            {card.figures.map((figure, figureIndex) => (
              <li key={figure.key} className="grid grid-cols-[1fr_7rem_auto_auto] items-center gap-2">
                <Input
                  aria-label="Figure label"
                  placeholder={figureIndex === 0 ? "Main result, e.g. Leads" : "Campaign spend"}
                  value={figure.label}
                  onChange={(event) =>
                    updateCard(card.key, (c) => ({
                      ...c,
                      figures: c.figures.map((f) => (f.key === figure.key ? { ...f, label: event.target.value } : f)),
                    }))
                  }
                  className="bg-background"
                />
                <Input
                  aria-label="Figure value"
                  placeholder="1,190"
                  value={figure.value}
                  onChange={(event) =>
                    updateCard(card.key, (c) => ({
                      ...c,
                      figures: c.figures.map((f) => (f.key === figure.key ? { ...f, value: event.target.value } : f)),
                    }))
                  }
                  className="tnum bg-background"
                />
                <button
                  type="button"
                  onClick={() => updateCard(card.key, (c) => ({ ...c, figures: moved(c.figures, figureIndex, -1) }))}
                  disabled={figureIndex === 0}
                  aria-label="Move figure up"
                  className={iconButton}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateCard(card.key, (c) => ({ ...c, figures: c.figures.filter((f) => f.key !== figure.key) }))
                  }
                  aria-label="Remove figure"
                  className={`${iconButton} hover:text-danger`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() =>
                  updateCard(card.key, (c) => ({ ...c, figures: [...c.figures, { key: key(), label: "", value: "" }] }))
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-background hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Add figure
              </button>
            </li>
          </ol>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() =>
            setCards((current) => [
              ...current,
              {
                key: key(),
                tag: "",
                name: "",
                figures: [
                  { key: key(), label: "", value: "" },
                  { key: key(), label: "Campaign spend", value: "" },
                ],
              },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          <Plus className="size-4" />
          Add campaign
        </button>
      </div>

      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </div>
  );
}
