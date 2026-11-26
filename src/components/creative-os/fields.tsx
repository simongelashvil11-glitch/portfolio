import type { ReactNode } from "react";

import { Input, Textarea } from "@/components/admin/ui";
import type { CosProject } from "@/db/creative-os";
import { cn } from "@/lib/utils";

import { FieldError } from "./forms";

/** A labelled field whose error comes from the surrounding CosForm. */
export function CosField({
  label,
  name,
  hint,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid content-start gap-1", className)}>
      <span className="text-sm font-semibold leading-5">{label}</span>
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
      <FieldGroup title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Project name" name="name">
            <Input name="name" defaultValue={project?.name} required placeholder="Acme skincare — spring launch" />
          </CosField>
          <CosField label="Brand name" name="brandName">
            <Input name="brandName" defaultValue={project?.brandName ?? ""} />
          </CosField>
          <CosField label="Company website" name="website">
            <Input name="website" type="url" defaultValue={project?.website ?? ""} placeholder="https://" />
          </CosField>
          <CosField label="Industry" name="industry">
            <Input name="industry" defaultValue={project?.industry ?? ""} placeholder="Skincare, e-commerce" />
          </CosField>
          <CosField label="Target countries" name="targetCountries" hint="Separate with commas.">
            <Input name="targetCountries" defaultValue={join(project?.targetCountries)} placeholder="United States, Canada" />
          </CosField>
          <CosField label="Target languages" name="targetLanguages" hint="Separate with commas.">
            <Input name="targetLanguages" defaultValue={join(project?.targetLanguages)} placeholder="English" />
          </CosField>
          <CosField label="Advertising platforms" name="platforms" hint="Separate with commas.">
            <Input name="platforms" defaultValue={join(project?.platforms)} placeholder="Meta, TikTok" />
          </CosField>
        </div>
        <CosField label="Target audience" name="targetAudience">
          <Textarea name="targetAudience" rows={3} defaultValue={project?.targetAudience ?? ""} />
        </CosField>
        <CosField label="Marketing objectives" name="objectives">
          <Textarea name="objectives" rows={3} defaultValue={project?.objectives ?? ""} />
        </CosField>
      </FieldGroup>

      <FieldGroup title="Brand and client" description="What the client has told you. Used as given; never rewritten by AI.">
        <CosField label="Brand voice" name="brandVoice">
          <Textarea name="brandVoice" rows={3} defaultValue={project?.brandVoice ?? ""} />
        </CosField>
        <CosField label="Client instructions" name="clientInstructions">
          <Textarea name="clientInstructions" rows={4} defaultValue={project?.clientInstructions ?? ""} />
        </CosField>
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Approved claims" name="approvedClaims" hint="One per line.">
            <Textarea name="approvedClaims" rows={4} defaultValue={project?.approvedClaims ?? ""} />
          </CosField>
          <CosField label="Prohibited claims" name="prohibitedClaims" hint="One per line.">
            <Textarea name="prohibitedClaims" rows={4} defaultValue={project?.prohibitedClaims ?? ""} />
          </CosField>
        </div>
        <CosField label="Known competitors" name="knownCompetitors">
          <Textarea name="knownCompetitors" rows={2} defaultValue={project?.knownCompetitors ?? ""} />
        </CosField>
        <CosField label="Internal notes" name="notes">
          <Textarea name="notes" rows={3} defaultValue={project?.notes ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
