import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosBriefs } from "@/db/creative-os";
import { briefDocx, briefMarkdown, fileSlug } from "@/lib/creative-os/export-docs";
import { guard } from "@/lib/creative-os/http";

/** A production brief as Word or Markdown. Built from the database; no AI call. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false });
  if (checked.error) return checked.error;
  const briefId = Number((await params).id);
  if (!Number.isInteger(briefId) || briefId <= 0) return new Response("Not found", { status: 404 });
  const [brief] = await db.select().from(cosBriefs).where(eq(cosBriefs.id, briefId)).limit(1);
  if (!brief) return new Response("Not found", { status: 404 });

  const name = `brief-${fileSlug(brief.title)}-${brief.id}`;
  if (request.nextUrl.searchParams.get("format") === "docx") {
    const buffer = await briefDocx(brief);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(briefMarkdown(brief), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
