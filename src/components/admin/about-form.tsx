"use client";

import { useActionState } from "react";

import { saveAboutPage, type FormState } from "@/actions/admin";
import { Field, Input, Textarea } from "@/components/admin/ui";
import type { Profile } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

/**
 * Every piece of copy on /about. The rows themselves are edited where they
 * live — Updates, Skills and Experience — since each is a list with its own
 * logos and ordering.
 */
export function AboutForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState(saveAboutPage, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <Field
        label="Page title"
        hint="Defaults to “About” when blank."
        error={state.fieldErrors?.aboutTitle}
      >
        <Input name="aboutTitle" defaultValue={profile?.aboutTitle ?? ""} placeholder="About" />
      </Field>

      <Field
        label="Intro"
        hint="Blank line starts a new paragraph, a single Enter breaks the line. ## heading, ### smaller heading, - bullet, --- divider. Falls back to your bio."
        error={state.fieldErrors?.about}
      >
        <Textarea name="about" rows={10} defaultValue={profile?.about ?? ""} />
      </Field>

      <Field
        label="Updates heading"
        hint="Defaults to “Personal updates”. The entries are edited under Updates."
        error={state.fieldErrors?.updatesHeading}
      >
        <Input
          name="updatesHeading"
          defaultValue={profile?.updatesHeading ?? ""}
          placeholder="Personal updates"
        />
      </Field>

      <Field
        label="Tech stack heading"
        hint="Defaults to “Tech stack”. The tools and their logos are edited under Skills."
        error={state.fieldErrors?.techHeading}
      >
        <Input
          name="techHeading"
          defaultValue={profile?.techHeading ?? ""}
          placeholder="Tech stack"
        />
      </Field>

      <Field label="Tech stack intro" error={state.fieldErrors?.techIntro}>
        <Textarea name="techIntro" rows={4} defaultValue={profile?.techIntro ?? ""} />
      </Field>

      <Field
        label="Career heading"
        hint="Defaults to “Career”. The roles and their logos are edited under Experience."
        error={state.fieldErrors?.careerHeading}
      >
        <Input
          name="careerHeading"
          defaultValue={profile?.careerHeading ?? ""}
          placeholder="Career"
        />
      </Field>

      <Field label="Career intro" error={state.fieldErrors?.careerIntro}>
        <Textarea name="careerIntro" rows={4} defaultValue={profile?.careerIntro ?? ""} />
      </Field>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>Save about page</SubmitButton>
        {state.success ? <p className="text-sm text-muted">{state.success}</p> : null}
      </div>
    </form>
  );
}
