"use client";

import { useState } from "react";

import { Copy } from "@/components/fluent-icons";
import { cn } from "@/lib/utils";

/** Copies a prompt or text to the clipboard, and says so. */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn("btn btn-secondary !min-h-7 !px-2 text-xs", className)}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Copy className="size-4" />
      {copied ? "Copied" : label}
    </button>
  );
}
