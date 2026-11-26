import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { cosProjects, KNOWLEDGE_KINDS } from "@/db/creative-os";
import { guard } from "@/lib/creative-os/http";
import { extractFromFile, saveKnowledge } from "@/lib/creative-os/knowledge";

/*
 * Adds an uploaded document's text to a project's knowledge base. The text
 * is extracted here with local libraries (no AI, no cost) and the file
 * itself is discarded. Vercel accepts request bodies up to 4.5 MB.
 */

export const maxDuration = 60;

const MAX_BYTES = 4_000_000;

export async function POST(request: NextRequest) {
  const checked = await guard(request, { write: true });
  if (checked.error) return checked.error;

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Invalid upload." }, { status: 400 });
  const fields = z
    .object({
      projectId: z.coerce.number().int().positive(),
      productId: z.coerce.number().int().positive().nullable(),
      kind: z.enum(KNOWLEDGE_KINDS),
      title: z.string().max(300),
    })
    .safeParse({
      projectId: form.get("projectId"),
      productId: form.get("productId") || null,
      kind: form.get("kind"),
      title: (form.get("title") as string | null)?.trim() ?? "",
    });
  const file = form.get("file");
  if (!fields.success || !(file instanceof File)) return Response.json({ error: "Choose a file and a type." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return Response.json({ error: "Files must be under 4 MB." }, { status: 400 });

  const [project] = await db.select({ id: cosProjects.id }).from(cosProjects).where(eq(cosProjects.id, fields.data.projectId)).limit(1);
  if (!project) return Response.json({ error: "Unknown project." }, { status: 404 });

  try {
    const content = await extractFromFile(file.name, file.type, new Uint8Array(await file.arrayBuffer()));
    if (content.trim().length < 20) {
      return Response.json(
        { error: "No text could be read from that file. A scanned PDF has no text layer; paste its text instead." },
        { status: 422 },
      );
    }
    const item = await saveKnowledge({
      projectId: fields.data.projectId,
      productId: fields.data.productId,
      kind: fields.data.kind,
      title: fields.data.title || file.name,
      sourceType: "file",
      fileName: file.name.slice(0, 300),
      content,
    });
    revalidatePath("/admin/creative-os", "layout");
    return Response.json({ ok: true, id: item.id, chars: item.charCount });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The file could not be read." }, { status: 422 });
  }
}
