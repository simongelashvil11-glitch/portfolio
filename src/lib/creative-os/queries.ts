import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { cosProjects } from "@/db/creative-os";

/** The project a /p/[projectId] page belongs to, once per request; 404 when it does not exist. */
export const getProjectOr404 = cache(async (raw: string) => {
  const projectId = Number(raw);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  const [project] = await db.select().from(cosProjects).where(eq(cosProjects.id, projectId)).limit(1);
  if (!project) notFound();
  return project;
});
