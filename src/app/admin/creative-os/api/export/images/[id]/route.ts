import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosImagePlans } from "@/db/creative-os";
import { fileSlug } from "@/lib/creative-os/export-docs";
import { imagesDocx, imagesMarkdown } from "@/lib/creative-os/export-images";
import { guard } from "@/lib/creative-os/http";

/** An AI image plan as Word or Markdown. Built from the database; no AI call. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false });
  if (checked.error) return checked.error;
  const planId = Number((await params).id);
  if (!Number.isInteger(planId) || planId <= 0) return new Response("Not found", { status: 404 });
  const [plan] = await db.select().from(cosImagePlans).where(eq(cosImagePlans.id, planId)).limit(1);
  if (!plan) return new Response("Not found", { status: 404 });

  const name = `ai-images-${fileSlug(plan.title)}-${plan.id}`;
  if (request.nextUrl.searchParams.get("format") === "docx") {
    const buffer = await imagesDocx(plan);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(imagesMarkdown(plan), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
