import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { cosAds, cosAiOperations, cosAuditLog, type CosAd } from "@/db/creative-os";

import { checkBudget, spentThisMonth } from "./budget";
import { getSettings } from "./pricing";

/*
 * Transcripts of video ads, made by ElevenLabs Scribe — Claude cannot hear
 * audio. Scribe handles Georgian ("high accuracy" in its own tables) and
 * costs about $0.20 per hour of audio, billed by the second: a 30-second ad
 * is a fifth of a cent.
 *
 * It is still a paid operation, so it follows the same rules as the Claude
 * runs: the API key must be set, both spending limits must allow the worst
 * case (the video's length, or 10 minutes when unknown), the run is in the
 * ledger before the call, and its real cost is recorded from the length of
 * audio transcribed. It runs when the owner presses Transcribe, or — only
 * if they switched it on in Settings — when the extension saves a video ad.
 *
 * The video is downloaded here from Facebook's CDN (the address the page
 * itself played it from) and uploaded to ElevenLabs; nothing else is sent.
 */

export const TRANSCRIBE_MODEL = "scribe_v2";
const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_SECONDS = 600;
const MAX_VIDEO_BYTES = 80_000_000;

export type TranscribeOutcome = { ok: true; costUsd: number; seconds: number; language: string | null } | { ok: false; reason: string };

/** Only Facebook's own CDN: the address must be the one the Ad Library page played the video from. */
export function isFacebookVideoUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /(^|\.)fbcdn\.net$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** The worst case for a video, in USD: its length (or 10 minutes when unknown), at the price per hour. */
export function transcriptWorstCase(videoSeconds: number | null, perHour: number): number {
  const seconds = Math.min(MAX_SECONDS, videoSeconds && videoSeconds > 0 ? videoSeconds * 1.1 + 5 : MAX_SECONDS);
  return (seconds / 3600) * perHour;
}

type Word = { text: string; start?: number | null; end?: number | null; type?: string };

const stamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Lines with real timestamps, measured by the transcription: a new line at a
 * pause, after a sentence ends, or when a line grows long.
 */
export function timestampedLines(words: Word[], fallback: string): string {
  const spoken = words.filter((word) => word.type !== "audio_event");
  if (!spoken.some((word) => typeof word.start === "number")) return fallback.trim();
  const lines: string[] = [];
  let current = "";
  let startedAt: number | null = null;
  let lastEnd = 0;
  for (const word of spoken) {
    const start = typeof word.start === "number" ? word.start : lastEnd;
    const isSpace = word.type === "spacing" || /^\s+$/.test(word.text);
    // A line never starts with a space.
    if (isSpace && !current.trim()) continue;
    if (!isSpace && current.trim() && (start - lastEnd > 0.8 || current.length > 110)) {
      lines.push(`[${stamp(startedAt ?? 0)}] ${current.trim()}`);
      current = "";
      startedAt = null;
    }
    if (!isSpace && startedAt === null) startedAt = start;
    current += word.text;
    // Pauses are measured between spoken words; a long "spacing" entry is itself the pause.
    if (!isSpace && typeof word.end === "number") lastEnd = word.end;
    if (!isSpace && /[.!?…]["»”']?$/.test(word.text.trim()) && current.trim().length > 25) {
      lines.push(`[${stamp(startedAt ?? 0)}] ${current.trim()}`);
      current = "";
      startedAt = null;
    }
  }
  if (current.trim()) lines.push(`[${stamp(startedAt ?? 0)}] ${current.trim()}`);
  return lines.join("\n");
}

const VIDEO_NOTE = "Video ad saved from the Ad Library. Paste what is said into the transcript so the analysis can read it.";

/**
 * Transcribes one ad's video into its Transcript. `key` makes the run
 * idempotent (a repeated request finds the first and does nothing).
 */
export async function transcribeAd(adId: number, { trigger, key }: { trigger: "manual" | "auto"; key: string }): Promise<TranscribeOutcome> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, reason: "The ElevenLabs API key is not set on this server (ELEVENLABS_API_KEY)." };

  const [ad] = await db.select().from(cosAds).where(eq(cosAds.id, adId)).limit(1);
  if (!ad) return { ok: false, reason: "That ad no longer exists." };
  if (ad.transcript?.trim()) return { ok: false, reason: "This ad already has a transcript. Clear it first to transcribe again." };
  if (!isFacebookVideoUrl(ad.videoUrl)) {
    return { ok: false, reason: "No video address was saved for this ad. Play the video once in the Ad Library, then save the ad again." };
  }

  const [existing] = await db.select({ id: cosAiOperations.id }).from(cosAiOperations).where(eq(cosAiOperations.idempotencyKey, key)).limit(1);
  if (existing) return { ok: false, reason: "Already requested." };
  const [busy] = await db
    .select({ id: cosAiOperations.id })
    .from(cosAiOperations)
    .where(
      and(
        eq(cosAiOperations.kind, "transcription"),
        eq(cosAiOperations.targetId, ad.id),
        eq(cosAiOperations.status, "running"),
        sql`${cosAiOperations.startedAt} > now() - interval '6 minutes'`,
      ),
    )
    .limit(1);
  if (busy) return { ok: false, reason: "This video is already being transcribed." };

  const settings = await getSettings();
  const worstCase = transcriptWorstCase(ad.videoSeconds, settings.transcriptionPerHour);
  const budget = await checkBudget(worstCase);
  if (!budget.ok) return { ok: false, reason: budget.reason };

  const [operation] = await db
    .insert(cosAiOperations)
    .values({
      idempotencyKey: key,
      kind: "transcription",
      projectId: ad.projectId,
      targetType: "ad",
      targetId: ad.id,
      model: TRANSCRIBE_MODEL,
      params: { trigger, videoSeconds: ad.videoSeconds, perHour: settings.transcriptionPerHour },
      status: "running",
      estimateLowUsd: ad.videoSeconds ? (ad.videoSeconds / 3600) * settings.transcriptionPerHour : 0,
      estimateHighUsd: worstCase,
      startedAt: new Date(),
    })
    .onConflictDoNothing({ target: cosAiOperations.idempotencyKey })
    .returning();
  if (!operation) return { ok: false, reason: "Already requested." };

  const finish = async (values: Partial<typeof cosAiOperations.$inferInsert>, action: string) => {
    await db.update(cosAiOperations).set({ ...values, completedAt: new Date() }).where(eq(cosAiOperations.id, operation.id));
    await db.insert(cosAuditLog).values({ action, entity: "ai_operation", entityId: operation.id, detail: { adId: ad.id, trigger } });
  };

  // The month again, with this run counted, in case another started at the same moment.
  if ((await spentThisMonth()) > budget.monthlyLimit + 1e-9) {
    await finish({ status: "blocked", error: "Monthly limit would be passed." }, "blocked");
    return { ok: false, reason: "This would pass your monthly limit." };
  }

  // 1. The video, from Facebook's CDN. Nothing has been sent to ElevenLabs yet, so a failure here costs nothing.
  let video: ArrayBuffer;
  try {
    const response = await fetch(ad.videoUrl!, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_VIDEO_BYTES) throw new Error("too large");
    video = await response.arrayBuffer();
    if (video.byteLength > MAX_VIDEO_BYTES) throw new Error("too large");
  } catch (error) {
    const reason =
      error instanceof Error && error.message === "too large"
        ? "The video is too large to transcribe here (over 80 MB)."
        : "The video could not be downloaded; its link has probably expired. Open the ad in the Ad Library, play it, and save it again.";
    await finish({ status: "failed", error: reason, costUsd: 0 }, "failed");
    return { ok: false, reason };
  }

  // 2. The transcript.
  const form = new FormData();
  form.append("file", new Blob([video], { type: "video/mp4" }), `ad-${ad.libraryId ?? ad.id}.mp4`);
  form.append("model_id", TRANSCRIBE_MODEL);
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");

  let result: { text?: string; language_code?: string; words?: Word[]; audio_duration_secs?: number | null };
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });
    const body = (await response.json().catch(() => ({}))) as typeof result & { detail?: unknown };
    if (!response.ok) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : Array.isArray(body.detail)
            ? (body.detail as { msg?: string }[]).map((item) => item.msg).filter(Boolean).join("; ")
            : (body.detail as { message?: string } | undefined)?.message;
      const reason = `ElevenLabs error ${response.status}${detail ? `: ${detail}` : ""}`;
      // An error answer means no transcript was produced: recorded at $0.
      await finish({ status: "failed", error: reason, costUsd: 0 }, "failed");
      return { ok: false, reason };
    }
    result = body;
  } catch {
    // Lost or timed out mid-request: the audio may have been processed, so the worst case stays counted.
    const reason = "The connection to ElevenLabs was lost or timed out. It may still be billed; try again later.";
    await finish({ status: "failed", error: reason }, "failed");
    return { ok: false, reason };
  }

  const words = Array.isArray(result.words) ? result.words : [];
  const lastEnd = words.reduce((max, word) => (typeof word.end === "number" && word.end > max ? word.end : max), 0);
  const seconds = result.audio_duration_secs ?? (lastEnd || ad.videoSeconds || 0);
  const cost = (seconds / 3600) * settings.transcriptionPerHour;
  const transcript = timestampedLines(words, result.text ?? "");

  if (!transcript) {
    await finish({ status: "completed", costUsd: cost, error: "No speech was found in the video." }, "completed");
    await db
      .update(cosAds)
      .set({ notes: ad.notes === VIDEO_NOTE ? "Transcribed automatically: no speech was found in this video." : ad.notes, updatedAt: new Date() })
      .where(eq(cosAds.id, ad.id));
    return { ok: true, costUsd: cost, seconds, language: result.language_code ?? null };
  }

  // Never overwrite a transcript pasted while this ran.
  await db
    .update(cosAds)
    .set({
      transcript,
      transcriptSource: "scribe",
      notes:
        ad.notes === VIDEO_NOTE
          ? `Transcript made automatically (ElevenLabs Scribe${result.language_code ? `, language: ${result.language_code}` : ""}). Check names, numbers and brand terms before quoting it.`
          : ad.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(cosAds.id, ad.id), sql`coalesce(${cosAds.transcript}, '') = ''`));
  await finish(
    { status: "completed", costUsd: cost, error: null, params: { trigger, seconds, language: result.language_code ?? null, perHour: settings.transcriptionPerHour } },
    "completed",
  );
  return { ok: true, costUsd: cost, seconds, language: result.language_code ?? null };
}

/** Whether a saved ad should be transcribed automatically now. */
export function wantsAutoTranscript(ad: Pick<CosAd, "mediaKind" | "videoUrl" | "transcript">, autoTranscribe: boolean): boolean {
  return autoTranscribe && ad.mediaKind === "video" && isFacebookVideoUrl(ad.videoUrl) && !ad.transcript?.trim();
}
