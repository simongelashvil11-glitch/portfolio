"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type Variant = "primary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:opacity-85",
  danger: "border border-line text-muted hover:border-red-500/60 hover:text-red-500",
};

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
    <button
      type="submit"
      disabled={pending}
      {...props}
      className={cn(
        "rounded-full px-5 py-2 text-sm font-medium transition-all disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
