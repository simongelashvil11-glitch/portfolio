import { Input, inputClass, Textarea } from "@/components/admin/ui";
import type { CosScript } from "@/db/creative-os";
import { COPY_KINDS, COPY_KIND_KEYS, FRAMEWORKS } from "@/lib/creative-os/creative-labels";
import { AWARENESS_LABEL, AWARENESS_STAGES } from "@/lib/creative-os/elements";
import { AD_FORMATS, PLATFORMS } from "@/lib/creative-os/labels";
import { LANGUAGES } from "@/lib/creative-os/writing-choices";

import { CosField, FieldGroup } from "./fields";

type Choices = {
  products: { id: number; name: string }[];
  segments: { id: number; name: string; focus: boolean }[];
  angles: { id: number; name: string }[];
  hooks: { id: number; text: string; angleId: number | null; bookmarked: boolean }[];
};

/**
 * The brief a script is written to. Filling it in is free; the writing
 * happens only when you authorize it on the script's page.
 */
export function ScriptBriefFields({
  script,
  choices,
  defaults = {},
}: {
  script?: CosScript;
  choices: Choices;
  defaults?: { angleId?: number | null; hookId?: number | null; productId?: number | null; language?: string; kind?: string | null };
}) {
  const focus = choices.segments.find((segment) => segment.focus);
  return (
    <div className="grid gap-5">
      <FieldGroup title="What to write">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Working title" name="title" hint="For you: “UGC — retention myth, v1”.">
            <Input name="title" required defaultValue={script?.title} />
          </CosField>
          <CosField label="Type" name="kind">
            <select name="kind" defaultValue={script?.kind ?? (defaults.kind && defaults.kind in COPY_KINDS ? defaults.kind : "ugc_script")} className={inputClass}>
              {COPY_KIND_KEYS.map((key) => (
                <option key={key} value={key}>
                  {COPY_KINDS[key].label}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Platform" name="platform">
            <select name="platform" defaultValue={script?.platform ?? "Meta"} className={inputClass}>
              <option value="">—</option>
              {PLATFORMS.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
          </CosField>
          <CosField label="Creative format" name="format">
            <select name="format" defaultValue={script?.format ?? ""} className={inputClass}>
              <option value="">—</option>
              {AD_FORMATS.map((format) => (
                <option key={format}>{format}</option>
              ))}
            </select>
          </CosField>
          <CosField label="Framework" name="framework" hint="Freeform lets the writer pick what suits the angle.">
            <select name="framework" defaultValue={script?.framework ?? "freeform"} className={inputClass}>
              {Object.entries(FRAMEWORKS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Length (seconds, for video)" name="durationSeconds" hint="About 2.5 spoken words a second. Empty for written copy.">
            <Input name="durationSeconds" inputMode="numeric" defaultValue={script?.durationSeconds ?? ""} placeholder="30" />
          </CosField>
          <CosField label="Language" name="language">
            <select name="language" defaultValue={script?.language ?? defaults.language ?? "English"} className={inputClass}>
              {LANGUAGES.map((language) => (
                <option key={language}>{language}</option>
              ))}
            </select>
          </CosField>
        </div>
      </FieldGroup>

      <FieldGroup title="Built from" description="Each choice brings its research with it. Leave any of them empty.">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Product" name="productId">
            <select name="productId" defaultValue={script?.productId ?? defaults.productId ?? (choices.products.length === 1 ? choices.products[0].id : "")} className={inputClass}>
              <option value="">—</option>
              {choices.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Audience segment" name="segmentId">
            <select name="segmentId" defaultValue={script?.segmentId ?? focus?.id ?? ""} className={inputClass}>
              <option value="">—</option>
              {choices.segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                  {segment.focus ? " (your focus)" : ""}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Angle" name="angleId">
            <select name="angleId" defaultValue={script?.angleId ?? defaults.angleId ?? ""} className={inputClass}>
              <option value="">—</option>
              {choices.angles.map((angle) => (
                <option key={angle.id} value={angle.id}>
                  {angle.name}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Hook to open with" name="hookId">
            <select name="hookId" defaultValue={script?.hookId ?? defaults.hookId ?? ""} className={inputClass}>
              <option value="">— let the writer open it</option>
              {choices.hooks.map((hook) => (
                <option key={hook.id} value={hook.id}>
                  {hook.bookmarked ? "★ " : ""}
                  {hook.text.length > 90 ? `${hook.text.slice(0, 90)}…` : hook.text}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Awareness stage" name="awarenessStage" hint="Empty: taken from the angle or segment.">
            <select name="awarenessStage" defaultValue={script?.awarenessStage ?? ""} className={inputClass}>
              <option value="">—</option>
              {AWARENESS_STAGES.filter((stage) => stage !== "unclear").map((stage) => (
                <option key={stage} value={stage}>
                  {AWARENESS_LABEL[stage]}
                </option>
              ))}
            </select>
          </CosField>
        </div>
      </FieldGroup>

      <FieldGroup title="Offer and direction">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Offer" name="offer" hint="Only what is really on offer. Empty: no offer is mentioned.">
            <Textarea name="offer" rows={2} defaultValue={script?.offer ?? ""} />
          </CosField>
          <CosField label="Call to action" name="cta">
            <Input name="cta" defaultValue={script?.cta ?? ""} placeholder="Shop now, Send a message…" />
          </CosField>
        </div>
        <CosField label="Your instructions" name="instructions" hint="Anything else: tone, things to mention or avoid, a reference ad to beat.">
          <Textarea name="instructions" rows={4} defaultValue={script?.instructions ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
