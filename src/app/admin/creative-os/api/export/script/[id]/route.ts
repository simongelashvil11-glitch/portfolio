import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { db } from "@/db";
import { cosScripts } from "@/db/creative-os";
import { fileSlug, scriptDocx, scriptMarkdown, scriptText } from "@/lib/creative-os/export-docs";
import { guard } from "@/lib/creative-os/http";

/** A script's current text as Word, Markdown or plain text. Built from the database; no AI call. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false });
  if (checked.error) return checked.error;
  const scriptId = Number((await params).id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) return new Response("Not found", { status: 404 });
  const [script] = await db.select().from(cosScripts).where(eq(cosScripts.id, scriptId)).limit(1);
  if (!script) return new Response("Not found", { status: 404 });

  const format = request.nextUrl.searchParams.get("format");
  const name = `${fileSlug(script.title)}-${script.id}`;
  if (format === "docx") {
    const buffer = await scriptDocx(script);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const markdown = format !== "txt";
  return new Response(markdown ? scriptMarkdown(script) : scriptText(script), {
    headers: {
      "Content-Type": markdown ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.${markdown ? "md" : "txt"}"`,
      "Cache-Control": "no-store",
    },
  });
}
