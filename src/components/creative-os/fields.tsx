import Link from "next/link";
import type { ReactNode } from "react";

import { Input, Textarea } from "@/components/admin/ui";
import type { CosProject } from "@/db/creative-os";
import { cn } from "@/lib/utils";

import { FieldError } from "./forms";

/** Who reads a field: shown as a small tag beside its label, so it is clear what each input feeds. */
export type FieldUse = "research" | "later" | "private";

const USE_TAG: Record<FieldUse, { label: string; title: string; className: string }> = {
  research: {
    label: "Used by research",
    title: "Sent to Claude with research runs, so it shapes the results.",
    className: "border-[#b4d6fa] bg-[#ebf3fc] text-[#0f548c]",
  },
  later: {
    label: "For later tools",
    title: "Saved now, not sent to research. The copywriting tools (a later phase) will use it.",
    className: "border-line-strong bg-surface text-muted",
  },
  private: {
    label: "Private",
    title: "Never sent to Claude.",
    className: "border-line-strong bg-surface text-muted",
  },
};

/** A labelled field whose error comes from the surrounding CosForm. */
export function CosField({
  label,
  name,
  hint,
  use,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: string;
  use?: FieldUse;
  children: ReactNode;
  className?: string;
}) {
  const tag = use ? USE_TAG[use] : null;
  return (
    <label className={cn("grid content-start gap-1", className)}>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold leading-5">
        {label}
        {tag ? (
          <span title={tag.title} className={cn("rounded-[4px] border px-1.5 text-[10px] font-semibold leading-4", tag.className)}>
            {tag.label}
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="text-xs leading-4 text-faint">{hint}</span> : null}
      <FieldError name={name} />
    </label>
  );
}

/** A titled group of fields, after Fluent's form sections. */
export function FieldGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-[8px] border border-line p-4 sm:p-5">
      <legend className="px-1.5 text-base font-semibold leading-[22px]">{title}</legend>
      {description ? <p className="-mt-2 text-xs text-faint">{description}</p> : null}
      {children}
    </fieldset>
  );
}

/** Every project field, for both the new-project form and the details page. */
export function ProjectFields({ project }: { project?: CosProject }) {
  const join = (items: string[] | undefined) => (items ?? []).join(", ");
  return (
    <div className="grid gap-5">
      <p className="rounded-[6px] bg-surface px-3 py-2.5 text-sm text-muted">
        Only the name is required. Leave anything you don&apos;t know empty: research fills the gaps, and you can come
        back and add things as you learn them. The fields that matter most are <strong>industry</strong>,{" "}
        <strong>target countries</strong>, the <strong>website</strong> and, on the Products tab, a product with its URL.{" "}
        <Link href="/admin/creative-os/guide#project-fields" className="text-accent hover:underline">
          What every field does
        </Link>
      </p>

      <FieldGroup title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Project name" name="name" use="research" hint="A label for you, e.g. the brand and the campaign.">
            <Input name="name" defaultValue={project?.name} required placeholder="Acme skincare — spring launch" />
          </CosField>
          <CosField label="Brand name" name="brandName" use="research" hint="The brand you write for. Searches use it.">
            <Input name="brandName" defaultValue={project?.brandName ?? ""} />
          </CosField>
          <CosField
            label="Company website"
            name="website"
            use="research"
            hint="The brand's homepage. Research reads it first. Empty if there isn't one yet."
          >
            <Input name="website" type="url" defaultValue={project?.website ?? ""} placeholder="https://" />
          </CosField>
          <CosField
            label="Industry"
            name="industry"
            use="research"
            hint="The category in plain words, as specific as you can: “at-home espresso grinders”, not “coffee”. Find my rivals and Voice of Customer lean on it most."
          >
            <Input name="industry" defaultValue={project?.industry ?? ""} placeholder="At-home espresso grinders" />
          </CosField>
          <CosField
            label="Target countries"
            name="targetCountries"
            use="research"
            hint="Separate with commas. Research focuses on these markets, and the first one sets the Ad Library country on competitor links. Write “United States” or “US”."
          >
            <Input name="targetCountries" defaultValue={join(project?.targetCountries)} placeholder="United States, Canada" />
          </CosField>
          <CosField label="Target languages" name="targetLanguages" use="research" hint="Separate with commas. Results come back in English either way.">
            <Input name="targetLanguages" defaultValue={join(project?.targetLanguages)} placeholder="English" />
          </CosField>
          <CosField label="Advertising platforms" name="platforms" use="research" hint="Where the ads run. Separate with commas.">
            <Input name="platforms" defaultValue={join(project?.platforms)} placeholder="Meta, TikTok" />
          </CosField>
        </div>
        <CosField
          label="Target audience"
          name="targetAudience"
          use="research"
          hint="Who the client says buys it, in a sentence or two. Don't know? Leave it empty: Voice of Customer and Audiences work it out from real customers."
        >
          <Textarea name="targetAudience" rows={3} defaultValue={project?.targetAudience ?? ""} />
        </CosField>
        <CosField
          label="Marketing objectives"
          name="objectives"
          use="research"
          hint="What the ads must achieve, e.g. “first orders from cold traffic” or “launch a new flavour”. Empty is fine."
        >
          <Textarea name="objectives" rows={3} defaultValue={project?.objectives ?? ""} />
        </CosField>
      </FieldGroup>

      <FieldGroup title="Brand and client" description="What the client has told you, used as given. Leave anything you haven't been told empty.">
        <CosField
          label="Brand voice"
          name="brandVoice"
          use="later"
          hint="How the brand sounds, e.g. “warm, plain-spoken, a little cheeky; never clinical”. Not needed for research. Fill it in when the client shares guidelines."
        >
          <Textarea name="brandVoice" rows={3} defaultValue={project?.brandVoice ?? ""} />
        </CosField>
        <CosField
          label="Client instructions"
          name="clientInstructions"
          use="later"
          hint="Anything the client asked for: must-says, formats, tone notes. Kept for briefs and copy later."
        >
          <Textarea name="clientInstructions" rows={4} defaultValue={project?.clientInstructions ?? ""} />
        </CosField>
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField
            label="Approved claims"
            name="approvedClaims"
            use="research"
            hint="Claims the client has signed off, one per line. Research treats them as given. Empty is fine."
          >
            <Textarea name="approvedClaims" rows={4} defaultValue={project?.approvedClaims ?? ""} />
          </CosField>
          <CosField
            label="Prohibited claims"
            name="prohibitedClaims"
            use="research"
            hint="Words or promises you must never use, one per line, e.g. “cures”, “guaranteed results”. Empty is fine."
          >
            <Textarea name="prohibitedClaims" rows={4} defaultValue={project?.prohibitedClaims ?? ""} />
          </CosField>
        </div>
        <CosField
          label="Known competitors"
          name="knownCompetitors"
          use="research"
          hint="Names you already know, comma-separated. Find my rivals will look for others, not these. To research one, add it on the Competitors tab. Don't know any? Leave it empty; finding them is what Find my rivals is for."
        >
          <Textarea name="knownCompetitors" rows={2} defaultValue={project?.knownCompetitors ?? ""} />
        </CosField>
        <CosField label="Internal notes" name="notes" use="private" hint="Your own notes. Never sent to Claude.">
          <Textarea name="notes" rows={3} defaultValue={project?.notes ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
