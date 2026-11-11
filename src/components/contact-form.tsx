"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import { sendMessage, type ContactState } from "@/actions/contact";
import { Send } from "@/components/fluent-icons";

const initialState: ContactState = { status: "idle" };

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      <Send filled />
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

/** A labelled control with its validation message, after Fluent's Field. */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm">
        {label} <span className="text-danger">*</span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendMessage, initialState);

  /*
   * Submitted by hand rather than through `<form action>`, which resets the
   * fields once the action returns — so a typo in the email address used to
   * cost the visitor their whole message.
   */
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  if (state.status === "success") {
    // Fluent's success MessageBar.
    return (
      <p className="rounded-[4px] border border-[#9fd89f] bg-[#f1faf1] px-3 py-2.5 text-sm" role="status">
        {state.message}
      </p>
    );
  }

  const describe = (field: "name" | "email" | "body") =>
    state.errors?.[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" error={state.errors?.name}>
          <input id="name" name="name" className="field" placeholder="Jane Doe" {...describe("name")} />
        </Field>
        <Field id="email" label="Email" error={state.errors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            className="field"
            placeholder="jane@company.com"
            {...describe("email")}
          />
        </Field>
      </div>

      <Field id="body" label="Message" error={state.errors?.body}>
        <textarea
          id="body"
          name="body"
          rows={5}
          className="field resize-y"
          placeholder="What are you working on?"
          {...describe("body")}
        />
      </Field>

      {/* Honeypot — hidden from people, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0"
      />

      {state.status === "error" && state.message ? (
        // Fluent's error MessageBar.
        <p className="rounded-[4px] border border-[#f1bbbc] bg-[#fdf3f4] px-3 py-2.5 text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton pending={pending} />
      </div>
    </form>
  );
}
