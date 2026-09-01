"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveExperience, type FormState } from "@/actions/admin";
import { Checkbox, Field, Input, Textarea } from "@/components/admin/ui";
import type { Experience } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function ExperienceForm({ experience }: { experience?: Experience }) {
  const [state, formAction] = useActionState(saveExperience, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      {experience ? <input type="hidden" name="id" value={experience.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Role" error={state.fieldErrors?.role}>
          <Input name="role" defaultValue={experience?.role ?? ""} required autoFocus />
        </Field>
        <Field label="Company" error={state.fieldErrors?.company}>
          <Input name="company" defaultValue={experience?.company ?? ""} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company URL" error={state.fieldErrors?.companyUrl}>
          <Input name="companyUrl" type="url" defaultValue={experience?.companyUrl ?? ""} />
        </Field>
        <Field
          label="Logo URL"
          hint="Shown beside the role in Career. Falls back to the first letter."
          error={state.fieldErrors?.logoUrl}
        >
          <Input name="logoUrl" type="url" defaultValue={experience?.logoUrl ?? ""} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start" hint="YYYY-MM, e.g. 2023-04" error={state.fieldErrors?.startDate}>
          <Input
            name="startDate"
            defaultValue={experience?.startDate ?? ""}
            placeholder="2023-04"
            required
          />
        </Field>
        <Field label="End" hint="Leave blank for Present" error={state.fieldErrors?.endDate}>
          <Input name="endDate" defaultValue={experience?.endDate ?? ""} placeholder="2025-01" />
        </Field>
      </div>

      <Field label="Description" error={state.fieldErrors?.description}>
        <Textarea name="description" rows={3} defaultValue={experience?.description ?? ""} />
      </Field>

      <Field
        label="Highlights"
        hint="One bullet per line."
        error={state.fieldErrors?.highlights}
      >
        <Textarea
          name="highlights"
          rows={5}
          defaultValue={(experience?.highlights ?? []).join("\n")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-6">
        <Field label="Sort order" className="w-32" error={state.fieldErrors?.sortOrder}>
          <Input
            name="sortOrder"
            type="number"
            defaultValue={experience?.sortOrder ?? 0}
            step={1}
          />
        </Field>
        <div className="pt-5">
          <Checkbox
            name="published"
            label="Published"
            defaultChecked={experience?.published ?? true}
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>{experience ? "Save changes" : "Add role"}</SubmitButton>
        <Link href="/admin/experience" className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
