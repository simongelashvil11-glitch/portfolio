"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { saveSkill, type FormState } from "@/actions/admin";
import { Field, Input } from "@/components/admin/ui";
import type { Skill } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

/**
 * Doubles as the quick-add row on the list and the edit form on a skill's own
 * page. Adding clears itself so the next one can be typed straight in; editing
 * redirects back to the list from the action.
 */
export function SkillForm({ categories, skill }: { categories: string[]; skill?: Skill }) {
  const [state, formAction] = useActionState(saveSkill, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={
        skill
          ? "grid max-w-2xl gap-5"
          : "flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-5"
      }
    >
      {skill ? <input type="hidden" name="id" value={skill.id} /> : null}

      <Field
        label="Skill"
        className={skill ? undefined : "min-w-40 flex-1"}
        error={state.fieldErrors?.name}
      >
        <Input name="name" defaultValue={skill?.name ?? ""} placeholder="Google Ads" required />
      </Field>

      <Field
        label="Category"
        className={skill ? undefined : "min-w-40 flex-1"}
        error={state.fieldErrors?.category}
      >
        <Input
          name="category"
          list="skill-categories"
          defaultValue={skill?.category ?? ""}
          placeholder="Channels"
        />
        <datalist id="skill-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </Field>

      <Field
        label="Logo URL"
        className={skill ? undefined : "min-w-56 flex-1"}
        hint={skill ? "Shown beside the name in Tech stack. Falls back to the first letter." : undefined}
        error={state.fieldErrors?.logoUrl}
      >
        <Input
          name="logoUrl"
          type="url"
          defaultValue={skill?.logoUrl ?? ""}
          placeholder="https://.../logo.svg"
        />
      </Field>

      <Field label="Order" className={skill ? "w-32" : "w-24"} error={state.fieldErrors?.sortOrder}>
        <Input name="sortOrder" type="number" defaultValue={skill?.sortOrder ?? 0} step={1} />
      </Field>

      {state.error ? <p className="w-full text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel={skill ? "Saving…" : "Adding…"}>
          {skill ? "Save changes" : "Add"}
        </SubmitButton>
        {skill ? (
          <Link href="/admin/skills" className="text-sm text-muted hover:text-foreground">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
