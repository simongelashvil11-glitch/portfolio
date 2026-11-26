"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";

import type { FormState } from "@/actions/creative-os";
import { SubmitButton } from "@/components/admin/submit-button";

/*
 * A CreativeOS form: runs a server action, shows its message, and hands
 * field-level errors to the <FieldError> under each input through context,
 * so server-rendered markup can sit inside it unchanged.
 */

const ErrorsContext = createContext<Record<string, string>>({});

export function CosForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  className,
  resetOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.success) form.current?.reset();
  }, [resetOnSuccess, state]);

  return (
    <ErrorsContext.Provider value={state.fieldErrors ?? {}}>
      <form ref={form} action={formAction} className={className ?? "grid gap-5"}>
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="text-sm text-[#107c10]">
              {state.success}
            </p>
          ) : null}
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const errors = useContext(ErrorsContext);
  return errors[name] ? <span className="text-xs leading-4 text-danger">{errors[name]}</span> : null;
}
