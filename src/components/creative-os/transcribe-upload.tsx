"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { usd } from "@/lib/creative-os/format";

/*
 * Transcribing a video that lives on your computer. The browser decodes the
 * video's sound, mixes it to mono at 16 kHz (plenty for speech) and packs it
 * as a WAV: about 1 MB for a 30-second ad, so even a large video file never
 * has to be uploaded. Only that audio is sent, and only when you press the
 * button showing the cost.
 */

const RATE = 16_000;
const MAX_BYTES = 4_000_000;

function toWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** The file's sound as 16 kHz mono WAV, and its length in seconds. */
async function extractAudio(file: File): Promise<{ wav: Blob; seconds: number }> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const frames = Math.ceil(decoded.duration * RATE);
    const offline = new OfflineAudioContext(1, frames, RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { wav: toWav(rendered.getChannelData(0)), seconds: decoded.duration };
  } finally {
    void context.close();
  }
}

type State =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "ready"; wav: Blob; seconds: number; name: string }
  | { step: "sending"; seconds: number }
  | { step: "done"; message: string }
  | { step: "error"; message: string; retry?: { wav: Blob; seconds: number; name: string } };

export function TranscribeUpload({ adId, perHour, keyAvailable }: { adId: number; perHour: number; keyAvailable: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ step: "idle" });

  async function choose(file: File | undefined) {
    if (!file) return;
    setState({ step: "reading" });
    try {
      const { wav, seconds } = await extractAudio(file);
      if (wav.size > MAX_BYTES) {
        setState({ step: "error", message: `This is ${Math.round(seconds)} seconds long; up to about 2 minutes can be sent. Trim it first.` });
        return;
      }
      setState({ step: "ready", wav, seconds, name: file.name });
    } catch {
      setState({ step: "error", message: "The sound in that file could not be read. Try an MP4, MOV, MP3 or WAV file." });
    }
  }

  async function send(ready: { wav: Blob; seconds: number; name: string }) {
    const { wav, seconds } = ready;
    setState({ step: "sending", seconds });
    const data = new FormData();
    data.set("adId", String(adId));
    data.set("seconds", String(Math.round(seconds * 10) / 10));
    data.set("key", crypto.randomUUID());
    data.set("file", wav, "audio.wav");
    const response = await fetch("/admin/creative-os/api/ad-transcribe", { method: "POST", body: data }).catch(() => null);
    const result = (await response?.json().catch(() => ({}))) as { ok?: boolean; error?: string; seconds?: number; costUsd?: number; language?: string | null } | undefined;
    if (result?.ok) {
      setState({ step: "done", message: `Transcribed ${Math.round(result.seconds ?? seconds)} seconds${result.language ? ` (${result.language})` : ""} for ${usd(result.costUsd ?? 0)}.` });
      router.refresh();
    } else {
      setState({ step: "error", message: result?.error ?? "The transcription failed. Research history shows what was recorded.", retry: ready });
    }
  }

  if (!keyAvailable) {
    return <p className="text-sm text-muted">Transcribing needs the ElevenLabs API key on the server (ELEVENLABS_API_KEY).</p>;
  }

  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted">
        Choose the video (or an audio file) from your computer. Your browser takes only the sound out of it, so big video files
        are fine; nothing is sent until you press Transcribe. Up to about 2 minutes.
      </p>
      <input
        type="file"
        accept="video/*,audio/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file again (after a change on disk) is noticed.
          event.target.value = "";
          void choose(file);
        }}
        disabled={state.step === "reading" || state.step === "sending"}
        className="text-sm file:mr-3 file:rounded-[4px] file:border file:border-line-strong file:bg-background file:px-3 file:py-1 file:text-sm"
      />
      {state.step === "reading" ? <p className="text-muted">Taking the sound out of the video…</p> : null}
      {state.step === "ready" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => void send(state)}>
            Transcribe · about {usd((state.seconds / 3600) * perHour)}
          </button>
          <span className="text-xs text-faint">
            {state.name}: {Math.round(state.seconds)} seconds of sound, {(state.wav.size / 1_000_000).toFixed(1)} MB to send
          </span>
        </div>
      ) : null}
      {state.step === "sending" ? <p role="status">Transcribing… (usually under a minute)</p> : null}
      {state.step === "done" ? (
        <p role="status" className="text-[#0e700e]">
          {state.message}
        </p>
      ) : null}
      {state.step === "error" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-danger">
            {state.message}
          </p>
          {state.retry ? (
            <button type="button" className="btn btn-secondary" onClick={() => state.retry && void send(state.retry)}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
