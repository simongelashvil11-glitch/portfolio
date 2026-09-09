"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { saveTool, type FormState } from "@/actions/admin";
import { Field, Input } from "@/components/admin/ui";
import type { Tool } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

/**
 * Doubles as the quick-add row on the Tech stack page and the edit form on a
 * tool's own page, the same way `SkillForm` does. Adding clears itself so the
 * next one can be typed straight in; editing redirects back from the action.
 */
export function ToolForm({ tool }: { tool?: Tool }) {
  const [state, formAction] = useActionState(saveTool, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={
        tool
          ? "grid max-w-2xl gap-5"
          : "flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-5"
      }
    >
      {tool ? <input type="hidden" name="id" value={tool.id} /> : null}

      <Field
        label="Name"
        className={tool ? undefined : "min-w-40 flex-1"}
        error={state.fieldErrors?.name}
      >
        <Input name="name" defaultValue={tool?.name ?? ""} placeholder="Notion" required />
      </Field>

      <Field
        label="Website"
        className={tool ? undefined : "min-w-48 flex-1"}
        hint={tool ? "The name links out to this. Leave blank for plain text." : undefined}
        error={state.fieldErrors?.url}
      >
        <Input
          name="url"
          type="url"
          defaultValue={tool?.url ?? ""}
          placeholder="https://notion.so"
        />
      </Field>

      <Field
        label="Description"
        className={tool ? undefined : "min-w-56 flex-1"}
        hint={tool ? "One short line. It sits beside the name, not under it." : undefined}
        error={state.fieldErrors?.description}
      >
        <Input
          name="description"
          defaultValue={tool?.description ?? ""}
          placeholder="Docs and planning"
          maxLength={200}
        />
      </Field>

      <Field label="Order" className={tool ? "w-32" : "w-24"} error={state.fieldErrors?.sortOrder}>
        <Input name="sortOrder" type="number" defaultValue={tool?.sortOrder ?? 0} step={1} />
      </Field>

      {state.error ? <p className="w-full text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel={tool ? "Saving…" : "Adding…"}>
          {tool ? "Save changes" : "Add"}
        </SubmitButton>
        {tool ? (
          <Link href="/admin/skills" className="text-sm text-muted hover:text-foreground">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
