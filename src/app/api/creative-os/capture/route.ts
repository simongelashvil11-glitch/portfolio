import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { CapturedAd, captureTargets, saveCapturedAd, verifyCaptureRequest } from "@/lib/creative-os/capture";
import { rateLimit, requestIp } from "@/lib/rate-limit";

/*
 * Where the CreativeOS Chrome extension saves ads from the Meta Ad Library.
 * Outside /admin on purpose: the extension has no admin cookie, so it proves
 * itself with the connection code from CreativeOS Settings instead (see
 * lib/creative-os/capture.ts). GET lists projects and competitors for its
 * pickers; POST saves one ad. No AI is involved and nothing costs money.
 */

export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  if (!rateLimit(`capture:${requestIp(request.headers)}`, 120, 60_000)) {
    return Response.json({ error: "Too many requests; wait a minute." }, { status: 429 });
  }
  if (!(await verifyCaptureRequest(request))) {
    return Response.json({ error: "Not connected: make a connection code in CreativeOS Settings and paste it into the extension." }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const refused = await authorize(request);
  if (refused) return refused;
  return Response.json({ ok: true, projects: await captureTargets() });
}

export async function POST(request: NextRequest) {
  const refused = await authorize(request);
  if (refused) return refused;

  const body = CapturedAd.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const field = body.error.issues[0]?.path.join(".") ?? "body";
    return Response.json({ error: `The ad could not be read (${field}).` }, { status: 400 });
  }
  const saved = await saveCapturedAd(body.data);
  if (!saved.ok) return Response.json({ error: saved.error }, { status: saved.status });

  revalidatePath("/admin/creative-os", "layout");
  const origin = request.nextUrl.origin;
  return Response.json({
    ok: true,
    created: saved.created,
    imageSaved: saved.imageSaved,
    url: `${origin}/admin/creative-os/p/${saved.projectId}/ads/${saved.adId}`,
  });
}
