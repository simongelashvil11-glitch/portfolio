import { Input, inputClass, Textarea } from "@/components/admin/ui";
import type { CosAngle } from "@/db/creative-os";
import { ANGLE_CATEGORIES, ANGLE_CATEGORY_LABEL } from "@/lib/creative-os/creative-labels";
import { AWARENESS_LABEL, AWARENESS_STAGES } from "@/lib/creative-os/elements";

import { CosField, FieldGroup } from "./fields";

/** Every field of an angle, for writing one by hand and for editing a generated one. */
export function AngleFields({ angle }: { angle?: CosAngle }) {
  return (
    <div className="grid gap-5">
      <FieldGroup title="The angle">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Name" name="name" hint="Short and memorable, so you can talk about it: “The retention myth”.">
            <Input name="name" required defaultValue={angle?.name} />
          </CosField>
          <CosField label="Category" name="category">
            <select name="category" defaultValue={angle?.category ?? "problem_solution"} className={inputClass}>
              {ANGLE_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {ANGLE_CATEGORY_LABEL[key]}
                </option>
              ))}
            </select>
          </CosField>
        </div>
        <CosField label="Core message" name="coreMessage" hint="The one thing the ad must make the viewer believe.">
          <Textarea name="coreMessage" rows={2} required defaultValue={angle?.coreMessage} />
        </CosField>
        <CosField label="Strategic hypothesis" name="hypothesis" hint="Why it should work for this audience now, as something a test can prove or disprove.">
          <Textarea name="hypothesis" rows={3} required defaultValue={angle?.hypothesis} />
        </CosField>
      </FieldGroup>

      <FieldGroup title="Who it speaks to">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Target audience" name="audience">
            <Textarea name="audience" rows={2} defaultValue={angle?.audience ?? ""} />
          </CosField>
          <CosField label="Awareness stage" name="awarenessStage">
            <select name="awarenessStage" defaultValue={angle?.awarenessStage ?? "unclear"} className={inputClass}>
              {AWARENESS_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {AWARENESS_LABEL[stage]}
                </option>
              ))}
            </select>
          </CosField>
          <CosField label="Pain point" name="painPoint">
            <Textarea name="painPoint" rows={2} defaultValue={angle?.painPoint ?? ""} />
          </CosField>
          <CosField label="Desire" name="desire">
            <Textarea name="desire" rows={2} defaultValue={angle?.desire ?? ""} />
          </CosField>
          <CosField label="Psychological motivation" name="motivation">
            <Textarea name="motivation" rows={2} defaultValue={angle?.motivation ?? ""} />
          </CosField>
          <CosField label="Supporting product benefit" name="productBenefit">
            <Textarea name="productBenefit" rows={2} defaultValue={angle?.productBenefit ?? ""} />
          </CosField>
        </div>
        <CosField label="Supporting customer evidence" name="customerEvidence" hint="What customers said that this rests on.">
          <Textarea name="customerEvidence" rows={3} defaultValue={angle?.customerEvidence ?? ""} />
        </CosField>
      </FieldGroup>

      <FieldGroup title="Making and testing it">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Recommended creative format" name="recommendedFormat">
            <Input name="recommendedFormat" defaultValue={angle?.recommendedFormat ?? ""} placeholder="UGC testimonial, founder story, demo…" />
          </CosField>
          <CosField label="Proof requirements" name="proofRequirements" hint="What the ad must show or cite to be believed.">
            <Textarea name="proofRequirements" rows={2} defaultValue={angle?.proofRequirements ?? ""} />
          </CosField>
        </div>
        <CosField label="Potential hooks" name="potentialHooks" hint="One per line.">
          <Textarea name="potentialHooks" rows={3} defaultValue={(angle?.potentialHooks ?? []).join("\n")} />
        </CosField>
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Potential weaknesses" name="weaknesses">
            <Textarea name="weaknesses" rows={2} defaultValue={angle?.weaknesses ?? ""} />
          </CosField>
          <CosField label="Testing recommendation" name="testingRecommendation">
            <Textarea name="testingRecommendation" rows={2} defaultValue={angle?.testingRecommendation ?? ""} />
          </CosField>
        </div>
        <CosField label="Notes" name="notes">
          <Textarea name="notes" rows={2} defaultValue={angle?.notes ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
