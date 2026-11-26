import { Input, inputClass, Textarea } from "@/components/admin/ui";
import type { CosAd } from "@/db/creative-os";
import { AD_FORMATS, PLATFORMS } from "@/lib/creative-os/labels";

import { CosField, FieldGroup } from "./fields";

/** The fields of an ad, for adding one and for editing it. */
export function AdFields({ ad }: { ad?: CosAd }) {
  return (
    <div className="grid gap-5">
      <FieldGroup title="About the ad">
        <div className="grid gap-4 sm:grid-cols-2">
          <CosField label="Title" name="title" className="sm:col-span-2">
            <Input name="title" required defaultValue={ad?.title} placeholder="Competitor UGC — 'I stopped buying…'" />
          </CosField>
          <CosField label="Advertiser" name="advertiser">
            <Input name="advertiser" defaultValue={ad?.advertiser ?? ""} />
          </CosField>
          <CosField label="Product category" name="productCategory">
            <Input name="productCategory" defaultValue={ad?.productCategory ?? ""} />
          </CosField>
          <CosField label="Platform" name="platform">
            <select name="platform" defaultValue={ad?.platform ?? ""} className={inputClass}>
              <option value="">—</option>
              {PLATFORMS.map((platform) => (
                <option key={platform}>{platform}</option>
              ))}
            </select>
          </CosField>
          <CosField label="Creative format" name="format">
            <select name="format" defaultValue={ad?.format ?? ""} className={inputClass}>
              <option value="">—</option>
              {AD_FORMATS.map((format) => (
                <option key={format}>{format}</option>
              ))}
            </select>
          </CosField>
          <CosField
            label="Source link"
            name="sourceUrl"
            hint="Kept as a reference. Ad libraries load with scripts and usually block automated readers, so paste the words below."
            className="sm:col-span-2"
          >
            <Input name="sourceUrl" type="url" defaultValue={ad?.sourceUrl ?? ""} placeholder="https://www.facebook.com/ads/library/?id=…" />
          </CosField>
          <CosField label="Tags" name="tags" hint="Separate with commas." className="sm:col-span-2">
            <Input name="tags" defaultValue={(ad?.tags ?? []).join(", ")} placeholder="UGC, founder, objection handling" />
          </CosField>
        </div>
      </FieldGroup>

      <FieldGroup
        title="What the ad says"
        description="The analysis works from these words (and any screenshots). It cannot watch a video or hear audio, so paste the spoken script; include timestamps only if you have real ones."
      >
        <CosField label="Transcript" name="transcript">
          <Textarea name="transcript" rows={10} defaultValue={ad?.transcript ?? ""} placeholder="What is said, in order." />
        </CosField>
        <CosField label="Ad copy" name="adCopy" hint="Primary text, headline and description, as they appear.">
          <Textarea name="adCopy" rows={5} defaultValue={ad?.adCopy ?? ""} />
        </CosField>
        <CosField label="Your notes" name="notes" hint="Sent with the ad when it is analysed: what you noticed, what the visuals show.">
          <Textarea name="notes" rows={3} defaultValue={ad?.notes ?? ""} />
        </CosField>
      </FieldGroup>
    </div>
  );
}
