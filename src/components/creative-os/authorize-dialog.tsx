"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Preview } from "@/actions/creative-os";
import { manualImport, manualPrompt } from "@/actions/creative-os-manual";
import { Dialog } from "@/components/dialog";
import { Sparkle } from "@/components/fluent-icons";
import { count, EFFORTS, usd, type Effort } from "@/lib/creative-os/format";
import { cn } from "@/lib/utils";

/*
 * The only way a paid operation starts. The owner picks a model (there is no
 * default: it is chosen every time), sees the estimate worked out on the
 * server without any AI call — materials sent, token caps, likely and worst-
 * case cost, the budget it fits in — and presses Authorize. Only then is the
 * request sent, with a fresh idempotency key and the worst case that was
 * shown, which the server will not exceed.
 *
 * While it runs, the dialog shows real elapsed time (no invented progress)
 * and a Cancel button that aborts the request; a request already sent may
 * still be billed, and the dialog says so.
 */

export type ModelOption = { model: string; label: string; inputPerMtok: number; outputPerMtok: number; note: string | null };

/** A choice that shapes the run (search depth, focus, how many), shown above the model. */
export type RunChoice = {
  name: string;
  label: string;
  options: { value: string; label: string; hint?: string }[];
  defaultValue: string;
  hint?: string;
  /** A free-text box instead of options (a rewrite instruction). */
  text?: { placeholder: string; maxLength: number };
};

type Phase =
  | { step: "choose" }
  | { step: "estimating" }
  | { step: "ready"; preview: Extract<Preview, { ok: true }> }
  | { step: "running"; preview: Extract<Preview, { ok: true }>; startedAt: number }
  | { step: "done"; message: string; href: string | null }
  | { step: "error"; message: string }
  | { step: "manual" };

export function AuthorizeDialog({
  triggerLabel,
  title,
  description,
  models,
  preview,
  endpoint,
  body,
  disabledReason,
  choices = [],
  durationHint = "usually 20–90 seconds",
  secondary = false,
  manual,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  models: ModelOption[];
  preview: (model: string, options: Record<string, string>) => Promise<Preview>;
  endpoint: string;
  body: Record<string, unknown>;
  disabledReason?: string | null;
  choices?: RunChoice[];
  durationHint?: string;
  /** A quieter trigger button, for a second paid action on the same page. */
  secondary?: boolean;
  /** Offer "Use my Claude subscription instead": copy the prompt to claude.ai, paste the answer back. Steps without web research only. */
  manual?: { kind: string; targetId: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [effort, setEffort] = useState<Effort>("medium");
  const [phase, setPhase] = useState<Phase>({ step: "choose" });
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(choices.map((choice) => [choice.name, choice.defaultValue])),
  );
  const [now, setNow] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const [manualState, setManualState] = useState<{ busy: boolean; error: string | null; prompt: string | null; copied: boolean; pasted: string }>({
    busy: false,
    error: null,
    prompt: null,
    copied: false,
    pasted: "",
  });

  useEffect(() => {
    if (phase.step !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [phase.step]);

  function close() {
    if (phase.step === "running") return; // cancel first
    setOpen(false);
    setPhase({ step: "choose" });
    setModel(null);
  }

  async function estimate() {
    if (!model) return;
    setPhase({ step: "estimating" });
    const result = await preview(model, options).catch(() => ({ ok: false as const, error: "The estimate could not be worked out." }));
    setPhase(result.ok ? { step: "ready", preview: result } : { step: "error", message: result.error });
  }

  async function run() {
    if (phase.step !== "ready") return;
    const abort = new AbortController();
    controller.current = abort;
    const startedAt = Date.now();
    setNow(startedAt);
    setPhase({ step: "running", preview: phase.preview, startedAt });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          ...body,
          options,
          model: phase.preview.model,
          effort,
          idempotencyKey: crypto.randomUUID(),
          authorizedMaxUsd: Number(phase.preview.high.toFixed(4)) + 0.0001,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        costUsd?: number | null;
        added?: number | null;
        href?: string | null;
      };
      if (result.ok) {
        const added = typeof result.added === "number" ? ` ${count(result.added)} added.` : "";
        setPhase({ step: "done", message: `Done.${added} Cost ${usd(result.costUsd ?? null)} by the price table.`, href: result.href ?? null });
        router.refresh();
      } else {
        setPhase({ step: "error", message: result.error ?? `The request failed (${response.status}).` });
        router.refresh();
      }
    } catch {
      setPhase({
        step: "error",
        message: abort.signal.aborted
          ? "Cancelled. If the request had already reached Claude, it may still be billed; History shows what was recorded."
          : "The connection was lost. Check History before running again.",
      });
      router.refresh();
    } finally {
      controller.current = null;
    }
  }

  const selected = models.find((option) => option.model === model) ?? null;

  async function copyManualPrompt() {
    if (!manual) return;
    setManualState((current) => ({ ...current, busy: true, error: null }));
    const result = await manualPrompt(manual.kind, manual.targetId, options).catch(() => ({ ok: false as const, error: "The prompt could not be built." }));
    if (!result.ok) {
      setManualState((current) => ({ ...current, busy: false, error: result.error }));
      return;
    }
    const copied = await navigator.clipboard.writeText(result.prompt).then(
      () => true,
      () => false,
    );
    setManualState((current) => ({ ...current, busy: false, prompt: result.prompt, copied }));
  }

  async function importAnswer() {
    if (!manual || !manualState.pasted.trim()) return;
    setManualState((current) => ({ ...current, busy: true, error: null }));
    const result = await manualImport(manual.kind, manual.targetId, options, manualState.pasted).catch(() => ({
      ok: false as const,
      error: "The answer could not be imported.",
    }));
    if (!result.ok) {
      setManualState((current) => ({ ...current, busy: false, error: result.error }));
      return;
    }
    setManualState({ busy: false, error: null, prompt: null, copied: false, pasted: "" });
    const added = typeof result.added === "number" ? ` ${count(result.added)} added.` : "";
    setPhase({ step: "done", message: `Imported from your Claude subscription.${added} No API cost.`, href: result.href });
    router.refresh();
  }

  const choiceFields = choices.map((choice) => (
    <fieldset key={choice.name}>
      <legend className="mb-1.5 text-sm font-semibold">{choice.label}</legend>
      {choice.text ? (
        <textarea
          value={options[choice.name] ?? ""}
          onChange={(event) => setOptions((current) => ({ ...current, [choice.name]: event.target.value }))}
          placeholder={choice.text.placeholder}
          maxLength={choice.text.maxLength}
          rows={3}
          className="field resize-y"
        />
      ) : choice.options.length > 4 ? (
        <select
          value={options[choice.name]}
          onChange={(event) => setOptions((current) => ({ ...current, [choice.name]: event.target.value }))}
          className="field"
        >
          {choice.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {choice.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setOptions((current) => ({ ...current, [choice.name]: option.value }))}
              aria-pressed={options[choice.name] === option.value}
              title={option.hint}
              className={cn(
                "rounded-[4px] border px-3 py-1 text-sm",
                options[choice.name] === option.value ? "border-accent bg-accent-soft font-semibold text-accent-hover" : "border-line-strong",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {(() => {
        const hint = choice.options.find((option) => option.value === options[choice.name])?.hint ?? choice.hint;
        return hint ? <p className="mt-1.5 text-xs text-faint">{hint}</p> : null;
      })()}
    </fieldset>
  ));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        className={secondary ? "btn btn-secondary" : "btn btn-primary"}
      >
        <Sparkle />
        {triggerLabel}
      </button>

      <Dialog open={open} title={title} onClose={close} widthClassName="max-w-2xl">
        <p className="-mt-2 mb-4 text-sm text-muted">{description}</p>
        {phase.step === "manual" ? (
          <p className="mb-5 rounded-[4px] border border-[#9fd89f] bg-[#f1faf1] px-3 py-2 text-sm">
            Free here: it runs in claude.ai on your Claude subscription. Nothing is sent to the API.
          </p>
        ) : (
          <p className="mb-5 rounded-[4px] border border-[#f9d5a7] bg-[#fff9f2] px-3 py-2 text-sm">
            This uses the Claude API and costs money. Nothing is sent until you press <strong>Authorize</strong>.
            {manual && (phase.step === "choose" || phase.step === "estimating") ? (
              <>
                {" "}
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setPhase({ step: "manual" })}>
                  Use my Claude subscription instead
                </button>
              </>
            ) : null}
          </p>
        )}

        {phase.step === "manual" ? (
          <div className="grid gap-5">
            {choiceFields}
            <ol className="grid list-decimal gap-1.5 pl-5 text-sm">
              <li>
                <button type="button" className="btn btn-primary" onClick={copyManualPrompt} disabled={manualState.busy}>
                  {manualState.busy && !manualState.prompt ? "Building the prompt…" : manualState.prompt ? "Copy the prompt again" : "Copy the prompt"}
                </button>
                {manualState.prompt ? (
                  <span className="ml-2 text-xs text-[#0e700e]">
                    {manualState.copied ? "Copied" : "Ready (copy it from the box below)"} · {count(manualState.prompt.length)} characters
                  </span>
                ) : null}
              </li>
              <li>
                Open{" "}
                <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  claude.ai ↗
                </a>
                , start a new chat, paste it and send. Opus or Sonnet both work.
              </li>
              <li>Copy Claude&apos;s whole answer (the copy button under the reply) and paste it here:</li>
            </ol>
            {manualState.prompt && !manualState.copied ? (
              <textarea readOnly value={manualState.prompt} rows={4} className="field font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
            ) : null}
            <textarea
              value={manualState.pasted}
              onChange={(event) => setManualState((current) => ({ ...current, pasted: event.target.value }))}
              rows={6}
              placeholder="Paste Claude's answer here (the JSON it returns)"
              className="field resize-y font-mono text-xs"
            />
            {manualState.error ? (
              <p role="alert" className="rounded-[4px] border border-[#f1bbbc] bg-[#fdf3f4] px-3 py-2 text-sm">
                {manualState.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setPhase({ step: "choose" })}>
                Back to the API
              </button>
              <button type="button" className="btn btn-primary" disabled={!manualState.pasted.trim() || manualState.busy} onClick={importAnswer}>
                {manualState.busy && manualState.prompt ? "Importing…" : "Import the answer"}
              </button>
            </div>
          </div>
        ) : null}

        {phase.step === "choose" || phase.step === "estimating" ? (
          <div className="grid gap-5">
            {choiceFields}

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Model</legend>
              {models.map((option) => (
                <label
                  key={option.model}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[6px] border px-3 py-2.5 text-sm transition-colors",
                    model === option.model ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="model"
                    value={option.model}
                    checked={model === option.model}
                    onChange={() => setModel(option.model)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span className="grid gap-0.5">
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs text-muted">
                      ${option.inputPerMtok} input · ${option.outputPerMtok} output per million tokens
                    </span>
                    {option.note ? <span className="text-xs text-faint">{option.note}</span> : null}
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Effort</legend>
              <div className="flex gap-1.5">
                {EFFORTS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEffort(level)}
                    aria-pressed={effort === level}
                    className={cn(
                      "rounded-[4px] border px-3 py-1 text-sm capitalize",
                      effort === level ? "border-accent bg-accent-soft font-semibold text-accent-hover" : "border-line-strong",
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-faint">More effort means more thinking: often better, always more output tokens.</p>
            </fieldset>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={close}>
                Close
              </button>
              <button type="button" className="btn btn-primary" disabled={!selected || phase.step === "estimating"} onClick={estimate}>
                {phase.step === "estimating" ? "Working out the cost…" : "Show the cost"}
              </button>
            </div>
          </div>
        ) : null}

        {phase.step === "ready" || phase.step === "running" ? (
          <div className="grid gap-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <Fact label="Model" value={phase.preview.modelLabel} />
              <Fact label="Effort" value={effort} />
              <Fact
                label="Web access"
                value={
                  phase.preview.webSearches || phase.preview.webFetches
                    ? `≤ ${phase.preview.webSearches} searches, ${phase.preview.webFetches} pages`
                    : "None"
                }
              />
              <Fact label="Input, up to" value={`${count(phase.preview.inputTokens)} tokens`} />
              <Fact label="Output, up to" value={`${count(phase.preview.maxOutputTokens)} tokens`} />
              <Fact label="Likely cost" value={`${usd(phase.preview.low)} or more`} />
            </dl>
            <div className="rounded-[6px] bg-surface px-3 py-2.5 text-sm">
              <p>
                <strong>At most {usd(phase.preview.high)}</strong>{" "}
                {phase.preview.webSearches
                  ? "if every search and page read is used, each result is long, and the whole output allowance is used."
                  : "if the whole output allowance is used."}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                This month: {usd(phase.preview.budget.spent)} of {usd(phase.preview.budget.monthlyLimit)} · per-operation limit{" "}
                {usd(phase.preview.budget.perOperationLimit)}. Estimates from your price table, not Anthropic&apos;s invoice.
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">What will be sent to Claude</p>
              <ul className="grid gap-0.5 text-sm text-muted">
                {phase.preview.materials.map((item) => (
                  <li key={item.label}>
                    · {item.label}
                    {item.chars ? <span className="text-faint"> ({count(item.chars)} characters)</span> : null}
                  </li>
                ))}
              </ul>
            </div>

            {!phase.preview.budget.allowed ? (
              <p role="alert" className="rounded-[4px] border border-[#f1bbbc] bg-[#fdf3f4] px-3 py-2 text-sm">
                {phase.preview.budget.reason}
              </p>
            ) : null}

            {phase.step === "running" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-line px-3 py-2.5">
                <p className="text-sm" role="status">
                  Running… {Math.max(0, Math.round((now - phase.startedAt) / 1000))}s
                  <span className="ml-2 text-xs text-faint">{durationHint}</span>
                </p>
                <button type="button" className="btn btn-secondary" onClick={() => controller.current?.abort()}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setPhase({ step: "choose" })}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" disabled={!phase.preview.budget.allowed} onClick={run}>
                  Authorize · up to {usd(phase.preview.high)}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {phase.step === "done" || phase.step === "error" ? (
          <div className="grid gap-4">
            <p
              role={phase.step === "error" ? "alert" : "status"}
              className={cn(
                "rounded-[4px] border px-3 py-2.5 text-sm",
                phase.step === "error" ? "border-[#f1bbbc] bg-[#fdf3f4]" : "border-[#9fd89f] bg-[#f1faf1]",
              )}
            >
              {phase.message}
            </p>
            <div className="flex justify-end gap-2">
              {phase.step === "done" && phase.href ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const href = phase.href!;
                    close();
                    router.push(href);
                  }}
                >
                  Open it
                </button>
              ) : null}
              <button type="button" className={phase.step === "done" && phase.href ? "btn btn-secondary" : "btn btn-primary"} onClick={close}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="truncate first-letter:uppercase">{value}</dd>
    </div>
  );
}
