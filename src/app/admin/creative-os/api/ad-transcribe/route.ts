import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { guard } from "@/lib/creative-os/http";
import { transcribeAd } from "@/lib/creative-os/transcribe";

/*
 * Transcribes audio the owner sends for an ad: the browser pulls the sound
 * out of a video on their computer and posts it here (small enough for the
 * hosting's 4.5 MB request limit), and ElevenLabs writes the transcript. A
 * paid run under the spending limits, like every transcript; the owner
 * pressed the button showing its cost.
 */

export const maxDuration = 300;

const MAX_BYTES = 4_000_000;

/** The audio formats accepted, recognised from the file's first bytes. */
function sniffAudio(bytes: Uint8Array): { type: string; extension: string } | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return { type: "audio/wav", extension: "wav" };
  if (ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return { type: "audio/mpeg", extension: "mp3" };
  if (ascii(4, 8) === "ftyp") return { type: "audio/mp4", extension: "m4a" };
  if (ascii(0, 4) === "OggS") return { type: "audio/ogg", extension: "ogg" };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { type: "audio/webm", extension: "webm" };
  return null;
}

export async function POST(request: NextRequest) {
  const checked = await guard(request, { write: true, limit: 10 });
  if (checked.error) return checked.error;

  const form = await request.formData().catch(() => null);
  const adId = Number(form?.get("adId"));
  const seconds = Number(form?.get("seconds"));
  const key = String(form?.get("key") ?? "");
  const file = form?.get("file");
  if (!Number.isInteger(adId) || adId <= 0 || !/^[a-zA-Z0-9-]{16,64}$/.test(key) || !(file instanceof File)) {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "The audio is over 4 MB; use a shorter clip (about 2 minutes at most)." }, { status: 413 });
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) return Response.json({ error: "The audio length could not be read." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const format = sniffAudio(new Uint8Array(bytes.slice(0, 16)));
  if (!format) return Response.json({ error: "That is not an audio file this can read (WAV, MP3, M4A, OGG or WebM)." }, { status: 415 });

  const outcome = await transcribeAd(adId, {
    trigger: "upload",
    key: `upload-transcript-${key}`,
    upload: { bytes, type: format.type, name: `ad-${adId}.${format.extension}`, seconds },
  });
  revalidatePath("/admin/creative-os", "layout");
  if (!outcome.ok) return Response.json({ ok: false, error: outcome.reason }, { status: 409 });
  return Response.json({ ok: true, seconds: outcome.seconds, costUsd: outcome.costUsd, language: outcome.language });
}
