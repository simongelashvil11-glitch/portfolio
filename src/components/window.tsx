import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The case study's panels — statistics, text, gallery — as one family of
 * windows: a white body in a hairline frame with Fluent's shadow4, and a
 * title bar painted with the sidebar's gradient. Sharing the shell is what
 * keeps them looking like parts of one page rather than three ideas.
 *
 * `band` is anything that should sit on the gradient under the title (the
 * statistics' headline figure); the body is everything below it.
 */
export function Window({
  id,
  title,
  icon,
  aside,
  band,
  children,
  bodyClassName,
}: {
  /** Labels the section; must be unique on the page. */
  id: string;
  title: ReactNode;
  icon: ReactNode;
  /** Small text at the right of the title bar, e.g. a source or a count. */
  aside?: ReactNode;
  band?: ReactNode;
  children?: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-[8px] border border-line bg-background shadow-fluent-4"
    >
      <div className={cn("shell-bg relative", children ? "border-b border-line" : null)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 text-xl text-lavender">{icon}</span>
            <h2 id={id} className="truncate text-sm font-semibold">
              {title}
            </h2>
          </span>
          {aside ? <p className="text-xs text-faint sm:ml-auto">{aside}</p> : null}
        </div>
        {band}
      </div>

      {children ? <div className={cn("px-4 py-5 sm:px-6 sm:py-6", bodyClassName)}>{children}</div> : null}
    </section>
  );
}

/*
 * Title-bar marks, drawn to sit with the Fluent set (20px grid, 1px stroke,
 * rounded corners). The generated set in fluent-icons.tsx has none of these.
 */

export function ChartMark() {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3.5" y="10.5" width="3" height="6" rx="1" />
      <rect x="8.5" y="6.5" width="3" height="10" rx="1" />
      <rect x="13.5" y="3.5" width="3" height="13" rx="1" />
    </svg>
  );
}

export function TextMark() {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
      <rect x="3.5" y="2.5" width="13" height="15" rx="2" />
      <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4.5" />
    </svg>
  );
}

export function ImageMark() {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <circle cx="13" cy="7.5" r="1.5" />
      <path d="m3 14.5 4.3-4.3a1 1 0 0 1 1.4 0L13.5 15" />
    </svg>
  );
}

/** A newspaper, drawn to sit with the other title-bar marks. */
export function NewsMark() {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 3.5h9a1 1 0 0 1 1 1v10.5a1.5 1.5 0 0 0 1.5 1.5H5a2 2 0 0 1-2-2V5a1.5 1.5 0 0 1 1.5-1.5" />
      <path d="M14.5 7.5h2a1 1 0 0 1 1 1V15a1.5 1.5 0 0 1-3 0" />
      <rect x="6" y="6.5" width="5.5" height="3.5" rx=".5" />
      <path d="M6 12.5h5.5M6 14.5h3.5" />
    </svg>
  );
}
