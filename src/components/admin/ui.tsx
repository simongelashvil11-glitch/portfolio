import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * The admin's building blocks, in the same Fluent 2 language as the public
 * site: its `.field`, `.btn` and `.card` classes (globals.css), sentence-case
 * labels after Fluent's Field, and Fluent's type ramp for headings.
 */

/** Text inputs and textareas: Fluent's field, as on the contact form. */
export const inputClass = "field";

/** Buttons, by role, so every admin page uses the same three. */
export const button = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  /** A destructive action: quiet until hovered, then red. */
  danger: "btn btn-secondary hover:!border-danger hover:!text-danger",
} as const;

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // content-start: beside a field with a hint, the grid row is taller, and
    // without it this field's input would stretch to fill the difference.
    <label className={cn("grid content-start gap-1", className)}>
      {/* Fluent's Label: 14px, regular weight, foreground colour. */}
      <span className="text-sm font-semibold leading-5 text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-4 text-faint">{hint}</span> : null}
      {error ? <span className="text-xs leading-4 text-danger">{error}</span> : null}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(inputClass, "resize-y", props.className)} />;
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" {...props} className="size-4 cursor-pointer rounded-[2px] accent-[var(--accent)]" />
      {label}
    </label>
  );
}

/** A white Fluent card: hairline stroke, 8px corners. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

/** A section heading inside a page: Fluent's Subtitle 2, 16/22 semibold. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-base font-semibold leading-[22px]", className)}>{children}</h2>;
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {/* Fluent's Title 1, as the site's page titles: 28/36, 32/40 from sm. */}
        <h1 className="text-[28px] font-semibold leading-9 sm:text-[32px] sm:leading-10">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-line-strong bg-surface-alt px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}
