"use client";

import Link from "next/link";
import { useActionState } from "react";

import { savePost, type FormState } from "@/actions/admin";
import { Checkbox, Field, Input, Textarea } from "@/components/admin/ui";
import type { Post } from "@/db/schema";

import { SubmitButton } from "./submit-button";

const initialState: FormState = {};

export function PostForm({ post }: { post?: Post }) {
  const [state, formAction] = useActionState(savePost, initialState);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <Field label="Title" error={state.fieldErrors?.title}>
        <Input name="title" defaultValue={post?.title ?? ""} required autoFocus />
      </Field>

      <Field
        label="Slug"
        hint="Leave blank to generate it from the title."
        error={state.fieldErrors?.slug}
      >
        <Input name="slug" defaultValue={post?.slug ?? ""} />
      </Field>

      <Field label="Excerpt" error={state.fieldErrors?.excerpt}>
        <Textarea name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} />
      </Field>

      <Field
        label="Content"
        hint="Blank lines separate paragraphs. ## and ### make headings, lines starting with - make bullets."
        error={state.fieldErrors?.content}
      >
        <Textarea name="content" rows={16} defaultValue={post?.content ?? ""} required />
      </Field>

      <Checkbox name="published" label="Published" defaultChecked={post?.published ?? false} />

      {state.error ? <p className="text-sm text-accent">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>{post ? "Save changes" : "Add post"}</SubmitButton>
        <Link href="/admin/posts" className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}
