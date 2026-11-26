import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosAdAnalyses, cosAds, cosAdSegments } from "@/db/creative-os";
import { analysisMarkdown } from "@/lib/creative-os/export";
import { guard } from "@/lib/creative-os/http";

/** One saved ad analysis as a Markdown file. Built from the database; no AI call. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false });
  if (checked.error) return checked.error;
  const analysisId = Number((await params).id);
  if (!Number.isInteger(analysisId) || analysisId <= 0) return new Response("Not found", { status: 404 });

  const [analysis] = await db.select().from(cosAdAnalyses).where(eq(cosAdAnalyses.id, analysisId)).limit(1);
  if (!analysis) return new Response("Not found", { status: 404 });
  const [ad] = await db.select().from(cosAds).where(eq(cosAds.id, analysis.adId)).limit(1);
  if (!ad) return new Response("Not found", { status: 404 });
  const segments = await db
    .select()
    .from(cosAdSegments)
    .where(eq(cosAdSegments.analysisId, analysisId))
    .orderBy(asc(cosAdSegments.position));

  const slug = ad.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ad";
  return new Response(analysisMarkdown(ad, analysis, segments), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="deconstruction-${slug}-${analysisId}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
