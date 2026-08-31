import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { experiences, posts, profile, projects, skills } from "@/db/schema";

export async function getProfile() {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  return row ?? null;
}

export async function getExperiences({ all = false } = {}) {
  return db
    .select()
    .from(experiences)
    .where(all ? undefined : eq(experiences.published, true))
    .orderBy(asc(experiences.sortOrder), desc(experiences.startDate));
}

export async function getProjects({ all = false } = {}) {
  return db
    .select()
    .from(projects)
    .where(all ? undefined : eq(projects.published, true))
    .orderBy(asc(projects.sortOrder), desc(projects.createdAt));
}

export async function getProjectBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.published, true)))
    .limit(1);
  return row ?? null;
}

export async function getSkills() {
  return db.select().from(skills).orderBy(asc(skills.sortOrder), asc(skills.name));
}

export async function getPosts({ all = false } = {}) {
  return db
    .select()
    .from(posts)
    .where(all ? undefined : eq(posts.published, true))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));
}

export async function getPostBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.published, true)))
    .limit(1);
  return row ?? null;
}

/** Groups skills by category, preserving the sort order from the query. */
export function groupSkills(rows: Awaited<ReturnType<typeof getSkills>>) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.category) ?? [];
    list.push(row);
    groups.set(row.category, list);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
}

/* ---- admin lookups (ignore the published flag) ---- */

export async function getExperienceById(id: number) {
  const [row] = await db.select().from(experiences).where(eq(experiences.id, id)).limit(1);
  return row ?? null;
}

export async function getProjectById(id: number) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

export async function getPostById(id: number) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}
