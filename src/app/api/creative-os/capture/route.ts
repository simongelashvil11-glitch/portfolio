import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after, type NextRequest } from "next/server";

import { db } from "@/db";
import { cosAds } from "@/db/creative-os";
import { CapturedAd, captureTargets, saveCapturedAd, verifyCaptureRequest } from "@/lib/creative-os/capture";
import { getSettings } from "@/lib/creative-os/pricing";
import { transcribeAd, wantsAutoTranscript } from "@/lib/creative-os/transcribe";
import { rateLimit, requestIp } from "@/lib/rate-limit";

/*
 * Where the CreativeOS Chrome extension saves ads from the Meta Ad Library.
 * Outside /admin on purpose: the extension has no admin cookie, so it proves
 * itself with the connection code from CreativeOS Settings instead (see
 * lib/creative-os/capture.ts). GET lists projects and competitors for its
 * pickers; POST saves one ad. Saving is free. If the owner switched on
 * automatic transcripts in Settings, a saved video ad is then transcribed
 * after the response is sent (a small paid run, within the spending limits).
 */

export const dynamic = "force-dynamic";
// Room for an automatic transcript to finish after the response.
export const maxDuration = 300;

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

  const settings = await getSettings();
  const [ad] = await db
    .select({ mediaKind: cosAds.mediaKind, videoUrl: cosAds.videoUrl, transcript: cosAds.transcript })
    .from(cosAds)
    .where(eq(cosAds.id, saved.adId))
    .limit(1);
  const transcribing = Boolean(ad && wantsAutoTranscript(ad, settings.autoTranscribe) && process.env.ELEVENLABS_API_KEY);
  if (transcribing) {
    // One automatic attempt per ad per day; a failure is in Research history, and Transcribe on the ad's page retries.
    const key = `auto-transcript-${saved.adId}-${new Date().toISOString().slice(0, 10)}`;
    after(async () => {
      await transcribeAd(saved.adId, { trigger: "auto", key });
      revalidatePath("/admin/creative-os", "layout");
    });
  }

  const origin = request.nextUrl.origin;
  return Response.json({
    ok: true,
    created: saved.created,
    imageSaved: saved.imageSaved,
    transcribing,
    url: `${origin}/admin/creative-os/p/${saved.projectId}/ads/${saved.adId}`,
  });
}
