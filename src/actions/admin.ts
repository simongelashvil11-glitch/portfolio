"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { experiences, messages, posts, profile, projects, skills } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

/** Empty strings become null so optional columns stay clean. */
const nullable = (value: FormDataEntryValue | null) => text(value) || null;

const checked = (value: FormDataEntryValue | null) => value === "on" || value === "true";

/** One item per line, blanks dropped. */
const lines = (value: FormDataEntryValue | null) =>
  text(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Comma-separated list. */
const csv = (value: FormDataEntryValue | null) =>
  text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** "Label | https://url" per line. */
const socialLines = (value: FormDataEntryValue | null) =>
  lines(value)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return { label: label.trim(), url: rest.join("|").trim() };
    })
    .filter((social) => social.label && social.url);

function failure(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

function revalidateSite(...paths: string[]) {
  revalidatePath("/");
  for (const path of paths) revalidatePath(path);
}

/* ------------------------------------------------------------------ */
/* profile                                                             */
/* ------------------------------------------------------------------ */

const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  headline: z.string().min(1, "Headline is required.").max(200),
  bio: z.string().min(1, "Bio is required."),
  location: z.string().max(120).nullable(),
  email: z.email("Enter a valid email address.").max(255).nullable(),
  availability: z.string().max(120).nullable(),
  resumeUrl: z.url("Enter a valid URL.").nullable(),
  socials: z.array(z.object({ label: z.string().min(1), url: z.url() })),
});

export async function saveProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const parsed = ProfileSchema.safeParse({
    name: text(formData.get("name")),
    headline: text(formData.get("headline")),
    bio: text(formData.get("bio")),
    location: nullable(formData.get("location")),
    email: nullable(formData.get("email")),
    availability: nullable(formData.get("availability")),
    resumeUrl: nullable(formData.get("resumeUrl")),
    socials: socialLines(formData.get("socials")),
  });

  if (!parsed.success) return failure(parsed.error);

  const values = { id: 1, ...parsed.data, updatedAt: new Date() };
  await db
    .insert(profile)
    .values(values)
    .onConflictDoUpdate({ target: profile.id, set: values });

  revalidateSite("/admin/profile");
  return { success: "Profile saved." };
}

/* ------------------------------------------------------------------ */
/* experience                                                          */
/* ------------------------------------------------------------------ */

const PERIOD = /^\d{4}(-\d{2})?$/;

const ExperienceSchema = z.object({
  role: z.string().min(1, "Role is required.").max(200),
  company: z.string().min(1, "Company is required.").max(200),
  companyUrl: z.url("Enter a valid URL.").nullable(),
  startDate: z.string().regex(PERIOD, "Use YYYY or YYYY-MM."),
  endDate: z.string().regex(PERIOD, "Use YYYY or YYYY-MM, or leave blank for Present.").nullable(),
  description: z.string().nullable(),
  highlights: z.array(z.string()),
  sortOrder: z.number().int(),
  published: z.boolean(),
});

export async function saveExperience(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = text(formData.get("id"));
  const parsed = ExperienceSchema.safeParse({
    role: text(formData.get("role")),
    company: text(formData.get("company")),
    companyUrl: nullable(formData.get("companyUrl")),
    startDate: text(formData.get("startDate")),
    endDate: nullable(formData.get("endDate")),
    description: nullable(formData.get("description")),
    highlights: lines(formData.get("highlights")),
    sortOrder: Number(text(formData.get("sortOrder")) || 0),
    published: checked(formData.get("published")),
  });

  if (!parsed.success) return failure(parsed.error);

  if (id) {
    await db.update(experiences).set(parsed.data).where(eq(experiences.id, Number(id)));
  } else {
    await db.insert(experiences).values(parsed.data);
  }

  revalidateSite("/admin/experience");
  redirect("/admin/experience");
}

export async function deleteExperience(formData: FormData) {
  await requireSession();
  await db.delete(experiences).where(eq(experiences.id, Number(text(formData.get("id")))));
  revalidateSite("/admin/experience");
}

/* ------------------------------------------------------------------ */
/* projects                                                            */
/* ------------------------------------------------------------------ */

const ProjectSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  slug: z.string().min(1, "Slug is required.").max(200),
  summary: z.string().min(1, "Summary is required."),
  description: z.string().nullable(),
  url: z.url("Enter a valid URL.").nullable(),
  repoUrl: z.url("Enter a valid URL.").nullable(),
  imageUrl: z.url("Enter a valid URL.").nullable(),
  tags: z.array(z.string()),
  year: z.string().max(12).nullable(),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  published: z.boolean(),
});

export async function saveProject(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const id = text(formData.get("id"));
  const title = text(formData.get("title"));

  const parsed = ProjectSchema.safeParse({
    title,
    slug: slugify(text(formData.get("slug")) || title),
    summary: text(formData.get("summary")),
    description: nullable(formData.get("description")),
    url: nullable(formData.get("url")),
    repoUrl: nullable(formData.get("repoUrl")),
    imageUrl: nullable(formData.get("imageUrl")),
    tags: csv(formData.get("tags")),
    year: nullable(formData.get("year")),
    featured: checked(formData.get("featured")),
    sortOrder: Number(text(formData.get("sortOrder")) || 0),
    published: checked(formData.get("published")),
  });

  if (!parsed.success) return failure(parsed.error);

  try {
    if (id) {
      await db.update(projects).set(parsed.data).where(eq(projects.id, Number(id)));
    } else {
      await db.insert(projects).values(parsed.data);
    }
  } catch {
    // The only unique constraint on this table is the slug.
    return { error: "That slug is already taken.", fieldErrors: { slug: "Already in use." } };
  }

  revalidateSite("/admin/projects", `/projects/${parsed.data.slug}`);
  redirect("/admin/projects");
}

export async function deleteProject(formData: FormData) {
  await requireSession();
  await db.delete(projects).where(eq(projects.id, Number(text(formData.get("id")))));
  revalidateSite("/admin/projects");
}

/* ------------------------------------------------------------------ */
/* skills                                                              */
/* ------------------------------------------------------------------ */

const SkillSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  category: z.string().min(1).max(100),
  sortOrder: z.number().int(),
});

export async function saveSkill(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const id = text(formData.get("id"));
  const parsed = SkillSchema.safeParse({
    name: text(formData.get("name")),
    category: text(formData.get("category")) || "General",
    sortOrder: Number(text(formData.get("sortOrder")) || 0),
  });

  if (!parsed.success) return failure(parsed.error);

  if (id) {
    await db.update(skills).set(parsed.data).where(eq(skills.id, Number(id)));
  } else {
    await db.insert(skills).values(parsed.data);
  }

  revalidateSite("/admin/skills");
  return { success: "Skill saved." };
}

export async function deleteSkill(formData: FormData) {
  await requireSession();
  await db.delete(skills).where(eq(skills.id, Number(text(formData.get("id")))));
  revalidateSite("/admin/skills");
}

/* ------------------------------------------------------------------ */
/* posts                                                               */
/* ------------------------------------------------------------------ */

const PostSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  slug: z.string().min(1, "Slug is required.").max(200),
  excerpt: z.string().nullable(),
  content: z.string().min(1, "Content is required."),
  published: z.boolean(),
});

export async function savePost(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();

  const id = text(formData.get("id"));
  const title = text(formData.get("title"));

  const parsed = PostSchema.safeParse({
    title,
    slug: slugify(text(formData.get("slug")) || title),
    excerpt: nullable(formData.get("excerpt")),
    content: text(formData.get("content")),
    published: checked(formData.get("published")),
  });

  if (!parsed.success) return failure(parsed.error);

  // Stamp the publish date the first time a post goes live.
  const values = {
    ...parsed.data,
    publishedAt: parsed.data.published ? new Date() : null,
  };

  try {
    if (id) {
      const [existing] = await db
        .select({ publishedAt: posts.publishedAt })
        .from(posts)
        .where(eq(posts.id, Number(id)))
        .limit(1);

      await db
        .update(posts)
        .set({
          ...values,
          publishedAt: parsed.data.published
            ? (existing?.publishedAt ?? new Date())
            : null,
        })
        .where(eq(posts.id, Number(id)));
    } else {
      await db.insert(posts).values(values);
    }
  } catch {
    return { error: "That slug is already taken.", fieldErrors: { slug: "Already in use." } };
  }

  revalidateSite("/admin/posts", "/writing", `/writing/${parsed.data.slug}`);
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  await requireSession();
  await db.delete(posts).where(eq(posts.id, Number(text(formData.get("id")))));
  revalidateSite("/admin/posts", "/writing");
}

/* ------------------------------------------------------------------ */
/* messages                                                            */
/* ------------------------------------------------------------------ */

export async function toggleMessageRead(formData: FormData) {
  await requireSession();
  const id = Number(text(formData.get("id")));
  await db
    .update(messages)
    .set({ read: checked(formData.get("read")) })
    .where(eq(messages.id, id));
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteMessage(formData: FormData) {
  await requireSession();
  await db.delete(messages).where(eq(messages.id, Number(text(formData.get("id")))));
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}
