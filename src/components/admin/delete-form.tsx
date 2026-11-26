"use client";

import { Delete } from "@/components/fluent-icons";
import { cn } from "@/lib/utils";

type DeleteFormProps = {
  /** A server action bound in the parent server component. */
  action: (formData: FormData) => Promise<void>;
  id: number;
  confirmMessage?: string;
  /** Tighter target, for use inside pills and table rows. */
  compact?: boolean;
};

/** A subtle icon button that asks before it deletes. */
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
        title="Delete"
        className={cn(
          "btn btn-subtle btn-icon text-faint hover:!text-danger",
          compact && "!min-h-6 !min-w-6 !p-0.5 [&_svg]:!text-base",
        )}
      >
        <Delete />
      </button>
    </form>
  );
}
