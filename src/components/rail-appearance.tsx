"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export type Rail = "light" | "dark";

/** Shared with the script in the root layout that reads it before first paint. */
export const RAIL_STORAGE_KEY = "rail";

/*
 * The appearance lives on `<html>` as `data-rail`, not in React state. That
 * is not a shortcut: a blocking script in the root layout has to set it before
 * anything paints, so the DOM already holds the answer by the time React runs,
 * and the palettes in `globals.css` hang off that same attribute.
 *
 * So it is read as what it is — an external store — rather than copied into
 * state and kept in sync, which is the thing `useSyncExternalStore` exists to
 * avoid.
 */
const listeners = new Set<() => void>();

function readRail(): Rail {
  return document.documentElement.dataset.rail === "dark" ? "dark" : "light";
}

/** The server has no DOM to read, and light is what `:root` renders. */
function readRailOnServer(): Rail {
  return "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setRail(next: Rail) {
  document.documentElement.dataset.rail = next;

  // A browser refusing storage is not a reason to refuse the change; it just
  // means the choice lasts as long as the tab does.
  try {
    window.localStorage.setItem(RAIL_STORAGE_KEY, next);
  } catch {
    /* no-op */
  }

  for (const listener of listeners) listener();
}

const OPTIONS: { value: Rail; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Picks the sidebar's appearance, as a segmented control rather than a switch
 * — a switch has to be read to work out which way is on, where two named
 * segments say what they are.
 */
export function RailAppearance() {
  const rail = useSyncExternalStore(subscribe, readRail, readRailOnServer);

  return (
    <div
      role="group"
      aria-label="Sidebar appearance"
      className="grid grid-cols-2 gap-1 rounded-lg border border-(--rail-key-border) bg-(--rail-key-bg) p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = rail === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setRail(value)}
            aria-pressed={on}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-[0.6875rem] font-medium transition-colors ${
              on
                ? "bg-(--rail-active) text-(--rail-ink) inset-ring inset-ring-(--rail-ring)"
                : "text-(--rail-ink-faint) hover:text-(--rail-ink)"
            }`}
          >
            <Icon className="size-3 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
