"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendMessage, type ContactState } from "@/actions/contact";

const initialState: ContactState = { status: "idle" };

const fieldClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-faint focus:border-accent focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(sendMessage, initialState);

  if (state.status === "success") {
    return (
      <p className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="name" className="font-mono text-xs uppercase tracking-widest text-muted">
            Name
          </label>
          <input id="name" name="name" className={fieldClass} placeholder="Jane Doe" />
          {state.errors?.name && <p className="text-xs text-accent">{state.errors.name}</p>}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={fieldClass}
            placeholder="jane@company.com"
          />
          {state.errors?.email && <p className="text-xs text-accent">{state.errors.email}</p>}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="body" className="font-mono text-xs uppercase tracking-widest text-muted">
          Message
        </label>
        <textarea id="body" name="body" rows={5} className={fieldClass} placeholder="What are you working on?" />
        {state.errors?.body && <p className="text-xs text-accent">{state.errors.body}</p>}
      </div>

      {/* Honeypot — hidden from people, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0"
      />

      {state.status === "error" && state.message && (
        <p className="text-sm text-accent">{state.message}</p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
