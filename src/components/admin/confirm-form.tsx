"use client";

import type { ReactNode } from "react";

/** A form that asks before it submits, for actions that cannot be undone. */
export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  message: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
