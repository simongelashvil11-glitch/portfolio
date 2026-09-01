"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveUpdate, type FormState } from "@/actions/admin";
import { Checkbox, Field, Input, Textarea } from "@/components/admin/ui";
import type { Update } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function UpdateForm({ update }: { update?: Update }) {
  const [state, formAction] = useActionState(saveUpdate, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      {update ? <input type="hidden" name="id" value={update.id} /> : null}

      <Field label="Headline" error={state.fieldErrors?.title}>
        <Input name="title" defaultValue={update?.title ?? ""} required autoFocus />
      </Field>

      <Field
        label="Link"
        hint="Optional. The headline links here — leave blank for a plain entry."
        error={state.fieldErrors?.url}
      >
        <Input name="url" type="url" defaultValue={update?.url ?? ""} />
      </Field>

      <Field label="Description" error={state.fieldErrors?.description}>
        <Textarea name="description" rows={4} defaultValue={update?.description ?? ""} />
      </Field>

      <Field
        label="Logo URL"
        hint="Small square mark shown before the headline. Falls back to the first letter."
        error={state.fieldErrors?.logoUrl}
      >
        <Input
          name="logoUrl"
          type="url"
          defaultValue={update?.logoUrl ?? ""}
          placeholder="https://.../logo.svg"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-6">
        <Field label="Date" hint="YYYY-MM" className="w-40" error={state.fieldErrors?.date}>
          <Input name="date" defaultValue={update?.date ?? ""} placeholder="2026-07" required />
        </Field>
        <Field label="Sort order" className="w-32" error={state.fieldErrors?.sortOrder}>
          <Input name="sortOrder" type="number" defaultValue={update?.sortOrder ?? 0} step={1} />
        </Field>
        <div className="pt-5">
          <Checkbox name="published" label="Published" defaultChecked={update?.published ?? true} />
        </div>
      </div>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>{update ? "Save changes" : "Add update"}</SubmitButton>
        <Link href="/admin/updates" className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
