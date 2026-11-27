import type { NextRequest } from "next/server";

import { guard } from "@/lib/creative-os/http";
import { projectExportRows, rowsToCsv } from "@/lib/creative-os/export-project";
import { rowsToXlsx } from "@/lib/creative-os/export-xlsx";

/**
 * Everything a project holds, as CSV (?format=csv, the default) or Excel
 * (?format=xlsx): for handing to another AI tool such as Manus, or reading in
 * a spreadsheet. Built from the database; no AI call.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await guard(request, { write: false });
  if (checked.error) return checked.error;
  const projectId = Number((await params).id);
  if (!Number.isInteger(projectId) || projectId <= 0) return new Response("Not found", { status: 404 });

  const exported = await projectExportRows(projectId);
  if (!exported) return new Response("Not found", { status: 404 });

  if (request.nextUrl.searchParams.get("format") === "xlsx") {
    return new Response(new Uint8Array(await rowsToXlsx(exported.rows)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exported.stem}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(rowsToCsv(exported.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.stem}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
