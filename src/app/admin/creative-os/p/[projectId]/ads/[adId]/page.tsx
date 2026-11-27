import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteAd, deleteAdImage, previewDeconstruction, saveAd } from "@/actions/creative-os";
import { transcribeVideo } from "@/actions/creative-os-research";
import { writeCopyForAd } from "@/actions/creative-os-writing";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { DeleteForm } from "@/components/admin/delete-form";
import { Panel } from "@/components/admin/stats";
import { button, EmptyState, inputClass } from "@/components/admin/ui";
import { AdFields } from "@/components/creative-os/ad-fields";
import { BulletList, ElementTag, HighlightedText, OverviewFacts, SegmentCard } from "@/components/creative-os/analysis-view";
import { AuthorizeDialog } from "@/components/creative-os/authorize-dialog";
import { CosForm } from "@/components/creative-os/forms";
import { TranscribeUpload } from "@/components/creative-os/transcribe-upload";
import { AdImagesUpload } from "@/components/creative-os/uploads";
import { ArrowDownload, ChevronRight } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAdAnalyses, cosAdImages, cosAds, cosAdSegments, cosAiOperations, cosScripts } from "@/db/creative-os";
import { when } from "@/lib/admin-time";
import { COPY_KINDS, COPY_KIND_KEYS } from "@/lib/creative-os/creative-labels";
import { ELEMENT_STYLE, type Element } from "@/lib/creative-os/elements";
import type { StoredOverview } from "@/lib/creative-os/export";
import { adDaysRunning, runningLabel, usd } from "@/lib/creative-os/format";
import { getPricing, getSettings } from "@/lib/creative-os/pricing";
import { getProjectOr404 } from "@/lib/creative-os/queries";
import { isFacebookVideoUrl, transcriptWorstCase } from "@/lib/creative-os/transcribe";
import { LANGUAGES } from "@/lib/creative-os/writing-choices";

export const dynamic = "force-dynamic";
// Transcribe runs as a server action on this page: room for the download and the transcription.
export const maxDuration = 300;

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/p/[projectId]/ads/[adId]">) {
  const [ad] = await db.select({ title: cosAds.title }).from(cosAds).where(eq(cosAds.id, Number((await params).adId) || 0)).limit(1);
  return { title: ad?.title ?? "Ad" };
}

export default async function AdPage({ params, searchParams }: PageProps<"/admin/creative-os/p/[projectId]/ads/[adId]">) {
  const { projectId, adId } = await params;
  const project = await getProjectOr404(projectId);
  const [ad] = await db
    .select()
    .from(cosAds)
    .where(and(eq(cosAds.id, Number(adId) || 0), eq(cosAds.projectId, project.id)))
    .limit(1);
  if (!ad) notFound();

  const [images, analyses, pricing, { transcriptionPerHour }, written] = await Promise.all([
    db.select({ id: cosAdImages.id, size: cosAdImages.size }).from(cosAdImages).where(eq(cosAdImages.adId, ad.id)).orderBy(asc(cosAdImages.id)),
    db
      .select({ analysis: cosAdAnalyses, cost: cosAiOperations.costUsd, effort: cosAiOperations.effort })
      .from(cosAdAnalyses)
      .leftJoin(cosAiOperations, eq(cosAiOperations.id, cosAdAnalyses.operationId))
      .where(eq(cosAdAnalyses.adId, ad.id))
      .orderBy(desc(cosAdAnalyses.createdAt)),
    getPricing(),
    getSettings(),
    db
      .select({ id: cosScripts.id, title: cosScripts.title, updatedAt: cosScripts.updatedAt })
      .from(cosScripts)
      .where(eq(cosScripts.adId, ad.id))
      .orderBy(desc(cosScripts.updatedAt)),
  ]);

  const requested = Number((await searchParams).analysis);
  const current = analyses.find((row) => row.analysis.id === requested) ?? analyses[0] ?? null;
  const segments = current
    ? await db.select().from(cosAdSegments).where(eq(cosAdSegments.analysisId, current.analysis.id)).orderBy(asc(cosAdSegments.position))
    : [];
  const numbers = new Map(segments.map((segment, index) => [segment.id, index + 1]));
  const data = current ? (current.analysis.overview as StoredOverview) : null;
  const usedElements = [...new Set(segments.map((segment) => segment.element))];
  const base = `/admin/creative-os/p/${project.id}/ads/${ad.id}`;
  const running = adDaysRunning(ad);
  const transcribeKey = Boolean(process.env.ELEVENLABS_API_KEY);
  const hasWords = Boolean(ad.transcript?.trim() || ad.adCopy?.trim() || ad.notes?.trim());
  const models = pricing
    .filter((row) => row.enabled)
    .map((row) => ({ model: row.model, label: row.label, inputPerMtok: row.inputPerMtok, outputPerMtok: row.outputPerMtok, note: row.note }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/admin/creative-os/p/${project.id}/ads`} className="text-sm text-accent hover:underline">
            Ad Deconstruction Lab
          </Link>
          <h2 className="mt-1 text-xl font-semibold leading-7">{ad.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{[ad.advertiser, ad.platform, ad.format ?? ad.mediaKind].filter(Boolean).join(" · ") || "No details"}</p>
          {ad.source === "extension" ? (
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {running !== null ? (
                <span className={running >= 30 ? "font-semibold text-[#0e700e]" : "font-semibold"}>
                  {runningLabel(running)}{ad.stillActive === false ? " (stopped)" : ""}
                </span>
              ) : null}
              {ad.startedRunning ? <span className="text-muted">since {ad.startedRunning}</span> : null}
              {ad.variations && ad.variations > 1 ? <span className="text-muted">{ad.variations} versions</span> : null}
              {ad.cta ? <span className="text-muted">CTA: {ad.cta}</span> : null}
              {ad.landingUrl ? (
                <a href={ad.landingUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                  Landing page ↗
                </a>
              ) : null}
              {ad.sourceUrl ? (
                <a href={ad.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
                  In the Ad Library ↗
                </a>
              ) : null}
              {ad.lastSeenAt ? <span className="text-faint">saved {when(ad.lastSeenAt)}</span> : null}
            </p>
          ) : null}
        </div>
        <AuthorizeDialog
          triggerLabel={current ? "Analyze again" : "Analyze ad"}
          title="Ad deconstruction"
          description="Breaks the ad into its direct-response parts: hook, problem, agitation, mechanism, proof, offer, CTA and the rest, each with its purpose, the principle behind it, what works and what to improve. Uses only what you saved for this ad; no web access."
          models={models}
          preview={previewDeconstruction.bind(null, ad.id)}
          endpoint="/admin/creative-os/api/deconstruct"
          body={{ adId: ad.id }}
          disabledReason={!ad.transcript && !ad.adCopy ? "Add the transcript or copy first." : null}
        />
      </div>

      {ad.mediaKind !== "image" && !ad.transcript?.trim() ? (
        <Panel title="Video transcript">
          {!transcribeKey ? (
            <p className="text-sm text-muted">
              Automatic transcripts need an ElevenLabs API key on the server (ELEVENLABS_API_KEY). See the{" "}
              <Link href="/admin/creative-os/guide#transcripts" className="text-accent hover:underline">
                Guide
              </Link>
              ; until then, paste what is said into the transcript below.
            </p>
          ) : (
            <div className="grid gap-5">
              {isFacebookVideoUrl(ad.videoUrl) ? (
                <CosForm action={transcribeVideo} submitLabel="Transcribe video" pendingLabel="Transcribing… (usually under a minute)">
                  <input type="hidden" name="adId" value={ad.id} />
                  <input type="hidden" name="key" value={crypto.randomUUID()} />
                  <p className="text-sm text-muted">
                    Writes what is said in the video into the transcript, with timestamps, using ElevenLabs Scribe (handles Georgian
                    and English).{" "}
                    {ad.videoSeconds
                      ? `About ${Math.round(ad.videoSeconds)} seconds of audio: roughly ${usd((ad.videoSeconds / 3600) * transcriptionPerHour)}.`
                      : `The length is unknown; at most ${usd(transcriptWorstCase(null, transcriptionPerHour))} (10 minutes).`}{" "}
                    Counted in your spending limits.
                  </p>
                </CosForm>
              ) : ad.source === "extension" ? (
                <p className="text-sm text-muted">
                  No video address was saved with this ad. In the Ad Library, play the video for a second and press Save to CreativeOS
                  again, or upload the video below.
                </p>
              ) : null}
              <section aria-label="Upload a video to transcribe" className={isFacebookVideoUrl(ad.videoUrl) || ad.source === "extension" ? "border-t border-line pt-4" : ""}>
                <h3 className="mb-2 text-sm font-semibold">{isFacebookVideoUrl(ad.videoUrl) ? "Or upload the video from your computer" : "Upload the video from your computer"}</h3>
                <TranscribeUpload adId={ad.id} perHour={transcriptionPerHour} keyAvailable={transcribeKey} />
              </section>
            </div>
          )}
        </Panel>
      ) : null}

      {!current ? (
        <EmptyState>
          {ad.transcript || ad.adCopy
            ? "Not analysed yet. Press Analyze ad to choose a model and see the cost before anything is sent."
            : "Add the ad's transcript or copy below, then analyze it."}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <span>
              Analysed {when(current.analysis.createdAt)} with {current.analysis.model}
              {current.effort ? `, ${current.effort} effort` : ""} · cost {usd(current.cost)}
            </span>
            <a href={`/admin/creative-os/api/export/analysis/${current.analysis.id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
              <ArrowDownload className="size-4" />
              Export as Markdown
            </a>
            {analyses.length > 1 ? (
              <span className="flex flex-wrap gap-2">
                Earlier runs:
                {analyses.map((row, index) => (
                  <Link
                    key={row.analysis.id}
                    href={`${base}?analysis=${row.analysis.id}`}
                    aria-current={row.analysis.id === current.analysis.id ? "page" : undefined}
                    className={row.analysis.id === current.analysis.id ? "font-semibold text-foreground" : "text-accent hover:underline"}
                  >
                    {analyses.length - index}
                  </Link>
                ))}
              </span>
            ) : null}
          </div>

          <Panel title="Overview">
            <OverviewFacts data={data!} />
          </Panel>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
            <Panel title="What works">
              <BulletList items={data!.overview.strengths} />
            </Panel>
            <Panel title="What is weak">
              <BulletList items={data!.overview.weaknesses} />
            </Panel>
            <Panel title="Top improvements">
              <BulletList items={data!.overview.top_improvements} />
            </Panel>
          </div>

          {ad.transcript || ad.adCopy ? (
            <Panel title="The ad, marked up">
              {usedElements.length > 0 ? (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {usedElements.map((element) => (
                    <ElementTag key={element} element={element} />
                  ))}
                </div>
              ) : null}
              {ad.transcript ? (
                <section aria-label="Transcript">
                  <h3 className="mb-2 text-sm font-semibold">Transcript</h3>
                  <HighlightedText text={ad.transcript} segments={segments.filter((segment) => segment.source === "transcript")} numbers={numbers} />
                </section>
              ) : null}
              {ad.adCopy ? (
                <section aria-label="Ad copy" className={ad.transcript ? "mt-5 border-t border-line pt-4" : ""}>
                  <h3 className="mb-2 text-sm font-semibold">Ad copy</h3>
                  <HighlightedText text={ad.adCopy} segments={segments.filter((segment) => segment.source === "copy")} numbers={numbers} />
                </section>
              ) : null}
              <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                Numbers match the segments below.{" "}
                {ad.transcriptSource === "scribe"
                  ? "The transcript's timestamps were measured by the automatic transcription; check names and numbers in it before quoting."
                  : "No timestamps are shown because none were measured."}{" "}
                The analysis worked from the words{images.length ? " and screenshots" : ""} you saved.
              </p>
            </Panel>
          ) : null}

          <Panel title={`Segment by segment (${segments.length})`}>
            <ol className="grid gap-3">
              {segments.map((segment, index) => (
                <SegmentCard key={segment.id} segment={segment} number={index + 1} />
              ))}
            </ol>
          </Panel>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            <Panel title="Direct-response checklist">
              <ul className="grid gap-1.5">
                {data!.checklist.map((item) => (
                  <li key={item.element} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 text-sm">
                    <span aria-hidden className={item.present ? "text-[#107c10]" : "text-faint"}>
                      {item.present ? "✓" : "–"}
                    </span>
                    <span>
                      <span className="font-semibold">{ELEMENT_STYLE[item.element as Element]?.label ?? item.element}</span>
                      <span className="sr-only">{item.present ? " (present)" : " (absent)"}</span>
                      {item.note ? <span className="text-muted"> — {item.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <div className="grid content-start gap-6">
              <Panel title="Persuasive techniques">
                <BulletList items={data!.overview.persuasive_techniques} />
              </Panel>
              <Panel title="Limits of this analysis">
                <BulletList items={data!.limitations} empty="None stated." />
                <p className="mt-3 text-xs text-faint">Judgements here are strategic opinions, not predictions of how the ad performs.</p>
              </Panel>
            </div>
          </div>
        </>
      )}

      <Panel title="Write copy for this ad">
        {written.length > 0 ? (
          <ul className="mb-4 grid gap-1 text-sm">
            {written.map((script) => (
              <li key={script.id} className="flex flex-wrap items-baseline gap-x-2">
                <Link href={`/admin/creative-os/p/${project.id}/scripts/${script.id}`} className="text-accent hover:underline">
                  {script.title}
                </Link>
                <span className="text-xs text-faint">changed {when(script.updatedAt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <CosForm action={writeCopyForAd} submitLabel={written.length > 0 ? "Start another" : "Start the copy"} pendingLabel="Creating…">
          <input type="hidden" name="adId" value={ad.id} />
          <p className="text-sm text-muted">
            Opens a new copy brief already filled in from this ad: {hasWords ? "what is said in it, its copy and notes" : "its transcript and copy (add them first)"}
            {current ? ", plus the hook, structure, offer and call to action from the analysis" : ""}. Nothing is sent yet; on the next
            page you press Generate (API or your Claude subscription) as with any copy.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold">What to write</span>
              <select name="kind" defaultValue="meta_primary_text" className={inputClass}>
                {COPY_KIND_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {COPY_KINDS[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold">Language</span>
              <select name="language" defaultValue={project.targetLanguages.some((language) => /georgian/i.test(language)) ? "Georgian" : "English"} className={inputClass}>
                {LANGUAGES.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
          </div>
        </CosForm>
      </Panel>

      <Panel title={`Screenshots (${images.length})`}>
        {images.length > 0 ? (
          <ul className="mb-4 flex flex-wrap gap-3">
            {images.map((image) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- private admin-only image served by our own route */}
                <img src={`/admin/creative-os/api/ad-images/${image.id}`} alt="Ad screenshot" className="h-40 w-auto rounded-[6px] border border-line object-contain" />
                <div className="absolute right-1 top-1 rounded-[4px] bg-white/90">
                  <DeleteForm action={deleteAdImage} id={image.id} compact confirmMessage="Remove this screenshot?" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-muted">Screenshots let the analysis see the visuals: the opening frame, on-screen text, the product shot.</p>
        )}
        <AdImagesUpload adId={ad.id} remaining={4 - images.length} />
      </Panel>

      <details className="group rounded-[8px] border border-line">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 text-faint transition-transform group-open:rotate-90" />
          Edit the ad
        </summary>
        <div className="grid gap-4 border-t border-line p-5">
          <CosForm action={saveAd} submitLabel="Save ad">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="id" value={ad.id} />
            <AdFields ad={ad} />
          </CosForm>
          <ConfirmForm action={deleteAd} message={`Delete "${ad.title}" and all its analyses? This cannot be undone.`}>
            <input type="hidden" name="id" value={ad.id} />
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className={button.danger}>
              Delete this ad
            </button>
          </ConfirmForm>
        </div>
      </details>
    </div>
  );
}
