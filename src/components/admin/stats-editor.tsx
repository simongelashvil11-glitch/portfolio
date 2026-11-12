"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/admin/ui";
import type { ProjectStat } from "@/db/schema";

type Row = ProjectStat & { key: number };

let nextKey = 0;
const withKey = (stat: ProjectStat): Row => ({ ...stat, key: nextKey++ });

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

/**
 * The figures in a project's statistics window, edited as rows.
 *
 * The rows travel to the server as one JSON field, so the action receives
 * them in the order shown here — that order is the order on the page.
 */
export function StatsEditor({ stats, error }: { stats: ProjectStat[]; error?: string }) {
  const [rows, setRows] = useState<Row[]>(() => stats.map(withKey));
  const groupsId = useId();

  const groups = [...new Set(rows.map((row) => row.group.trim()).filter(Boolean))];

  function update(key: number, patch: Partial<ProjectStat>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(index: number, by: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row);
      return next;
    });
  }

  function add() {
    // A new row joins the last row's group, which is usually where the next
    // figure belongs.
    const group = rows.at(-1)?.group ?? "";
    setRows((current) => [...current, withKey({ label: "", value: "", group, featured: false })]);
  }

  const payload = JSON.stringify(rows.map(({ label, value, group, featured }) => ({ label, value, group, featured })));

  return (
    <div className="grid gap-2">
      <input type="hidden" name="stats" value={payload} />

      <datalist id={groupsId}>
        {groups.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>

      {rows.length > 0 ? (
        <>
          <div className="hidden grid-cols-[1fr_6.5rem_8rem_auto] gap-2 px-3 text-xs text-faint sm:grid">
            <span>Label</span>
            <span>Value</span>
            <span>Group</span>
            <span className="w-[9.5rem]" />
          </div>

          <ol className="grid gap-2">
            {rows.map((row, index) => (
              <li
                key={row.key}
                className="grid gap-2 rounded-lg border border-line bg-surface p-2 sm:grid-cols-[1fr_6.5rem_8rem_auto] sm:items-center"
              >
                <Input
                  aria-label="Label"
                  placeholder="Link clicks"
                  value={row.label}
                  onChange={(event) => update(row.key, { label: event.target.value })}
                  className="bg-background"
                />
                <Input
                  aria-label="Value"
                  placeholder="492,834"
                  value={row.value}
                  onChange={(event) => update(row.key, { value: event.target.value })}
                  className="tnum bg-background"
                />
                <Input
                  aria-label="Group"
                  placeholder="Results"
                  list={groupsId}
                  value={row.group}
                  onChange={(event) => update(row.key, { group: event.target.value })}
                  className="bg-background"
                />

                <div className="flex items-center gap-1">
                  <label
                    className="mr-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted"
                    title="Set large across the top of the window"
                  >
                    <input
                      type="checkbox"
                      checked={row.featured}
                      onChange={(event) => update(row.key, { featured: event.target.checked })}
                      className="size-4 cursor-pointer accent-[var(--accent)]"
                    />
                    Headline
                  </label>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className={iconButton}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move down"
                    className={iconButton}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                    aria-label="Remove figure"
                    className={`${iconButton} hover:text-danger`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          <Plus className="size-4" />
          Add figure
        </button>
      </div>

      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </div>
  );
}
