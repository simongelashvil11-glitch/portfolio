"use client";

import { useActionState, useEffect, useRef } from "react";

import { saveSkill, type FormState } from "@/actions/admin";
import { Field, Input } from "@/components/admin/ui";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function SkillForm({ categories }: { categories: string[] }) {
  const [state, formAction] = useActionState(saveSkill, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the row after a successful add so the next one can be typed straight in.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-5"
    >
      <Field label="Skill" className="min-w-40 flex-1" error={state.fieldErrors?.name}>
        <Input name="name" placeholder="TypeScript" required />
      </Field>

      <Field label="Category" className="min-w-40 flex-1" error={state.fieldErrors?.category}>
        <Input name="category" list="skill-categories" placeholder="Engineering" />
        <datalist id="skill-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </Field>

      <Field label="Order" className="w-24" error={state.fieldErrors?.sortOrder}>
        <Input name="sortOrder" type="number" defaultValue={0} step={1} />
      </Field>

      <SubmitButton pendingLabel="Adding…">Add</SubmitButton>

      {state.error ? <p className="w-full text-sm text-accent">{state.error}</p> : null}
    </form>
  );
}
