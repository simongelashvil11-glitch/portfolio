"use client";

import { useActionState } from "react";

import { saveProfile, type FormState } from "@/actions/admin";
import { Field, Input, Textarea } from "@/components/admin/ui";
import type { Profile } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState(saveProfile, initialState);

  const socialsValue = (profile?.socials ?? [])
    .map((social) => `${social.label} | ${social.url}`)
    .join("\n");

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={state.fieldErrors?.name}>
          <Input name="name" defaultValue={profile?.name ?? ""} required />
        </Field>
        <Field label="Location" error={state.fieldErrors?.location}>
          <Input name="location" defaultValue={profile?.location ?? ""} placeholder="Tbilisi, GE" />
        </Field>
      </div>

      <Field
        label="Role"
        hint="Short job title, shown under your name in the sidebar."
        error={state.fieldErrors?.role}
      >
        <Input
          name="role"
          defaultValue={profile?.role ?? ""}
          placeholder="Digital Marketing Specialist"
        />
      </Field>

      <Field
        label="Headline"
        hint="The large line at the top of the page. Keep it to a sentence."
        error={state.fieldErrors?.headline}
      >
        <Input
          name="headline"
          defaultValue={profile?.headline ?? ""}
          placeholder="I build fast, considered web products."
          required
        />
      </Field>

      <Field label="Bio" error={state.fieldErrors?.bio}>
        <Textarea name="bio" rows={5} defaultValue={profile?.bio ?? ""} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" error={state.fieldErrors?.email}>
          <Input name="email" type="email" defaultValue={profile?.email ?? ""} />
        </Field>
        <Field
          label="Availability"
          hint="Shown as a small pill. Leave blank to hide."
          error={state.fieldErrors?.availability}
        >
          <Input
            name="availability"
            defaultValue={profile?.availability ?? ""}
            placeholder="Available for freelance"
          />
        </Field>
      </div>

      <Field label="Résumé URL" error={state.fieldErrors?.resumeUrl}>
        <Input name="resumeUrl" type="url" defaultValue={profile?.resumeUrl ?? ""} />
      </Field>

      <Field
        label="Socials"
        hint="One per line, as: Label | https://url"
        error={state.fieldErrors?.socials}
      >
        <Textarea
          name="socials"
          rows={4}
          defaultValue={socialsValue}
          placeholder={"GitHub | https://github.com/you\nLinkedIn | https://linkedin.com/in/you"}
        />
      </Field>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>Save profile</SubmitButton>
        {state.success ? <p className="text-sm text-muted">{state.success}</p> : null}
      </div>
    </form>
  );
}
