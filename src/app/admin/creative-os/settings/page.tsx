import { saveLimits, savePrice } from "@/actions/creative-os";
import { Checkbox, Input, PageHeading } from "@/components/admin/ui";
import { CosField, FieldGroup } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { usd } from "@/lib/creative-os/format";
import { getPricing, getSettings } from "@/lib/creative-os/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, pricing] = await Promise.all([getSettings(), getPricing()]);

  return (
    <>
      <PageHeading title="Settings" description="Spending limits and the prices CreativeOS estimates with." />
      <div className="grid max-w-3xl gap-6">
        <FieldGroup
          title="Spending limits"
          description="Both must be set before any paid operation runs. Every operation is checked against them at its worst case before it is sent."
        >
          <CosForm action={saveLimits} submitLabel="Save limits">
            <div className="grid gap-4 sm:grid-cols-3">
              <CosField label="Monthly limit (USD)" name="monthlyLimitUsd" hint="Calendar month, UTC.">
                <Input name="monthlyLimitUsd" inputMode="decimal" defaultValue={settings.monthlyLimitUsd ?? ""} placeholder="e.g. 20" />
              </CosField>
              <CosField label="Per-operation limit (USD)" name="perOperationLimitUsd" hint="The most one operation may cost.">
                <Input name="perOperationLimitUsd" inputMode="decimal" defaultValue={settings.perOperationLimitUsd ?? ""} placeholder="e.g. 1" />
              </CosField>
              <CosField label="Web search, per 1,000 (USD)" name="webSearchPer1k">
                <Input name="webSearchPer1k" inputMode="decimal" defaultValue={settings.webSearchPer1k} />
              </CosField>
            </div>
          </CosForm>
          <p className="text-xs text-faint">
            These limits are enforced by CreativeOS from its own estimates. The only hard cap is the spending limit on your Anthropic
            account (platform.claude.com, Settings → Limits); keep one set there too.
          </p>
        </FieldGroup>

        <FieldGroup
          title="Model prices"
          description="USD per million tokens, from Anthropic's published API prices on 26 November 2026. Edit them if Anthropic changes its prices; switch a model off to hide it from the model picker."
        >
          <ul className="grid gap-3">
            {pricing.map((row) => (
              <li key={row.model} className="rounded-[6px] border border-line p-4">
                <p className="font-semibold">
                  {row.label} <span className="font-mono text-xs font-normal text-faint">{row.model}</span>
                </p>
                {row.note ? <p className="text-xs text-faint">{row.note}</p> : null}
                <div className="mt-3">
                  <CosForm action={savePrice} submitLabel="Save prices" className="grid gap-3">
                    <input type="hidden" name="model" value={row.model} />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <CosField label="Input" name="inputPerMtok">
                        <Input name="inputPerMtok" inputMode="decimal" defaultValue={row.inputPerMtok} />
                      </CosField>
                      <CosField label="Output" name="outputPerMtok">
                        <Input name="outputPerMtok" inputMode="decimal" defaultValue={row.outputPerMtok} />
                      </CosField>
                      <CosField label="Cache write" name="cacheWritePerMtok">
                        <Input name="cacheWritePerMtok" inputMode="decimal" defaultValue={row.cacheWritePerMtok} />
                      </CosField>
                      <CosField label="Cache read" name="cacheReadPerMtok">
                        <Input name="cacheReadPerMtok" inputMode="decimal" defaultValue={row.cacheReadPerMtok} />
                      </CosField>
                    </div>
                    <Checkbox name="enabled" label="Offer this model" defaultChecked={row.enabled} />
                  </CosForm>
                </div>
                <p className="mt-2 text-xs text-faint">
                  A 10,000-token input with a 5,000-token answer costs about {usd(row.inputPerMtok * 0.01 + row.outputPerMtok * 0.005)}.
                </p>
              </li>
            ))}
          </ul>
        </FieldGroup>
      </div>
    </>
  );
}
