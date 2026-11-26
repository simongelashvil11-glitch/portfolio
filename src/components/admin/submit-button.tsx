"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { button } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Variant = "primary" | "danger";

/** A form's submit button, as one of the site's Fluent buttons; it says so while the form is sending. */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
} & Omit<React.ComponentProps<"button">, "children" | "className">) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} {...props} className={cn(button[variant], className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
