"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveProject, type FormState } from "@/actions/admin";
import { Checkbox, Field, Input, Textarea } from "@/components/admin/ui";
import type { Project } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction] = useActionState(saveProject, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <Field label="Title" error={state.fieldErrors?.title}>
        <Input name="title" defaultValue={project?.title ?? ""} required autoFocus />
      </Field>

      <Field
        label="Slug"
        hint="Leave blank to generate it from the title."
        error={state.fieldErrors?.slug}
      >
        <Input name="slug" defaultValue={project?.slug ?? ""} placeholder="my-project" />
      </Field>

      <Field
        label="Summary"
        hint="One line, shown in the work list."
        error={state.fieldErrors?.summary}
      >
        <Textarea name="summary" rows={2} defaultValue={project?.summary ?? ""} required />
      </Field>

      <Field
        label="Case study"
        hint="Optional — adding text gives the project its own page instead of linking straight out. Blank line starts a new paragraph, a single Enter breaks the line. ## heading, ### smaller heading, - bullet, --- divider."
        error={state.fieldErrors?.description}
      >
        <Textarea name="description" rows={8} defaultValue={project?.description ?? ""} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Live URL" error={state.fieldErrors?.url}>
          <Input name="url" type="url" defaultValue={project?.url ?? ""} />
        </Field>
        <Field label="Repository URL" error={state.fieldErrors?.repoUrl}>
          <Input name="repoUrl" type="url" defaultValue={project?.repoUrl ?? ""} />
        </Field>
      </div>

      <Field
        label="Cover image URL"
        hint="Any https image URL."
        error={state.fieldErrors?.imageUrl}
      >
        <Input name="imageUrl" type="url" defaultValue={project?.imageUrl ?? ""} />
      </Field>

      <Field
        label="Logo URL"
        hint="Small square mark shown before the title in the work list. Falls back to the first letter."
        error={state.fieldErrors?.logoUrl}
      >
        <Input
          name="logoUrl"
          type="url"
          defaultValue={project?.logoUrl ?? ""}
          placeholder="https://.../logo.svg"
        />
      </Field>

      <Field
        label="Gallery"
        hint="One image URL per line. Shown as a grid on the case study; each opens full size."
        error={state.fieldErrors?.gallery}
      >
        <Textarea
          name="gallery"
          rows={5}
          defaultValue={(project?.gallery ?? []).join("\n")}
          placeholder={"https://.../one.jpg\nhttps://.../two.jpg"}
        />
      </Field>

      <Field
        label="Video URL"
        hint="A YouTube link. Shows a thumbnail on the row that opens the video in place."
        error={state.fieldErrors?.videoUrl}
      >
        <Input
          name="videoUrl"
          type="url"
          defaultValue={project?.videoUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags" hint="Comma separated." error={state.fieldErrors?.tags}>
          <Input
            name="tags"
            defaultValue={(project?.tags ?? []).join(", ")}
            placeholder="Next.js, Design"
          />
        </Field>
        <Field label="Year" error={state.fieldErrors?.year}>
          <Input name="year" defaultValue={project?.year ?? ""} placeholder="2025" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Field label="Sort order" className="w-32" error={state.fieldErrors?.sortOrder}>
          <Input name="sortOrder" type="number" defaultValue={project?.sortOrder ?? 0} step={1} />
        </Field>
        <div className="flex gap-6 pt-5">
          <Checkbox name="featured" label="Featured" defaultChecked={project?.featured ?? false} />
          <Checkbox name="published" label="Published" defaultChecked={project?.published ?? true} />
        </div>
      </div>

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>{project ? "Save changes" : "Add project"}</SubmitButton>
        <Link href="/admin/projects" className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
