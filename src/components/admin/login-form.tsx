"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/actions/auth";
import { Field, Input } from "@/components/admin/ui";

import { SubmitButton } from "./submit-button";

const initialState: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email">
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="mt-2">
        <SubmitButton pendingLabel="Signing in…" className="w-full">
          Sign in
        </SubmitButton>
      </div>
    </form>
  );
}
