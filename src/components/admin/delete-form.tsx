"use client";

import { Trash2 } from "lucide-react";

type DeleteFormProps = {
  /** A server action bound in the parent server component. */
  action: (formData: FormData) => Promise<void>;
  id: number;
  confirmMessage?: string;
  /** Tighter target, for use inside pills and table rows. */
  compact?: boolean;
};

export function DeleteForm({
  action,
  id,
  confirmMessage = "Delete this permanently?",
  compact = false,
}: DeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Delete"
        className={`grid place-items-center rounded-lg text-faint transition-colors hover:bg-surface hover:text-red-500 ${
          compact ? "size-6" : "size-8"
        }`}
      >
        <Trash2 className={compact ? "size-3" : "size-4"} />
      </button>
    </form>
  );
}
