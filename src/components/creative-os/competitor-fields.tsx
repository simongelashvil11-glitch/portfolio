import { Input, inputClass, Textarea } from "@/components/admin/ui";
import type { CosCompetitor } from "@/db/creative-os";
import { COMPETITOR_KIND_LABEL } from "@/lib/creative-os/research-labels";

import { CosField } from "./fields";

/** A competitor's editable details, for adding one and for its page. */
export function CompetitorFields({ competitor }: { competitor?: CosCompetitor }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CosField label="Name" name="name" use="research" hint="The brand name as it trades.">
          <Input name="name" required defaultValue={competitor?.name} />
        </CosField>
        <CosField
          label="Type"
          name="kind"
          hint="Direct: sells the same kind of product. Indirect: different product, same problem. Alternative: what people do instead."
        >
          <select name="kind" defaultValue={competitor?.kind ?? "direct"} className={inputClass}>
            {Object.entries(COMPETITOR_KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </CosField>
        <CosField label="Website" name="website" use="research" hint="Competitor research starts here. Filled in by research if you leave it empty.">
          <Input name="website" type="url" defaultValue={competitor?.website ?? ""} placeholder="https://" />
        </CosField>
        <CosField label="Facebook page" name="facebookUrl" hint="Optional. Filled in when research finds it.">
          <Input name="facebookUrl" type="url" defaultValue={competitor?.facebookUrl ?? ""} placeholder="https://facebook.com/…" />
        </CosField>
        <CosField label="Instagram" name="instagramUrl" hint="Optional.">
          <Input name="instagramUrl" type="url" defaultValue={competitor?.instagramUrl ?? ""} placeholder="https://instagram.com/…" />
        </CosField>
        <CosField label="TikTok" name="tiktokUrl" hint="Optional.">
          <Input name="tiktokUrl" type="url" defaultValue={competitor?.tiktokUrl ?? ""} placeholder="https://tiktok.com/@…" />
        </CosField>
      </div>
      <CosField label="Notes" name="notes" use="research" hint="Anything you know about them. Sent with their research.">
        <Textarea name="notes" rows={2} defaultValue={competitor?.notes ?? ""} />
      </CosField>
    </div>
  );
}

/** Links to look at a competitor's ads and pages yourself. */
export function CompetitorLinks({ competitor, adLibrary }: { competitor: CosCompetitor; adLibrary: string }) {
  const links = [
    { href: adLibrary, label: "Meta Ad Library" },
    competitor.website ? { href: competitor.website, label: "Website" } : null,
    competitor.facebookUrl ? { href: competitor.facebookUrl, label: "Facebook" } : null,
    competitor.instagramUrl ? { href: competitor.instagramUrl, label: "Instagram" } : null,
    competitor.tiktokUrl ? { href: competitor.tiktokUrl, label: "TikTok" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          {link.label} ↗
        </a>
      ))}
    </span>
  );
}
