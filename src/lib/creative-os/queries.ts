import "server-only";

import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { cosAngles, cosAudienceSegments, cosHooks, cosProducts, cosProjects } from "@/db/creative-os";

/** The project a /p/[projectId] page belongs to, once per request; 404 when it does not exist. */
export const getProjectOr404 = cache(async (raw: string) => {
  const projectId = Number(raw);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!project) notFound();
  return project;
});

/** What the writing tools let you choose from in a project: products, segments, live angles and hooks. */
export const getWritingChoices = cache(async (projectId: number) => {
  const [products, segments, angles, hooks] = await Promise.all([
    db.select({ id: cosProducts.id, name: cosProducts.name }).from(cosProducts).where(eq(cosProducts.projectId, projectId)).orderBy(asc(cosProducts.name)),
    db
      .select({ id: cosAudienceSegments.id, name: cosAudienceSegments.personaName, focus: cosAudienceSegments.focus })
      .from(cosAudienceSegments)
      .where(eq(cosAudienceSegments.projectId, projectId))
      .orderBy(desc(cosAudienceSegments.focus), asc(cosAudienceSegments.position)),
    db
      .select({ id: cosAngles.id, name: cosAngles.name, status: cosAngles.status })
      .from(cosAngles)
      .where(and(eq(cosAngles.projectId, projectId), notInArray(cosAngles.status, ["rejected", "archived"])))
      .orderBy(asc(cosAngles.name)),
    db
      .select({ id: cosHooks.id, text: cosHooks.text, angleId: cosHooks.angleId, bookmarked: cosHooks.bookmarked })
      .from(cosHooks)
      .where(and(eq(cosHooks.projectId, projectId), notInArray(cosHooks.status, ["rejected", "archived"])))
      .orderBy(desc(cosHooks.bookmarked), desc(cosHooks.createdAt))
      .limit(200),
  ]);
  return { products, segments, angles, hooks };
});
