/* Small pieces for showing who a visitor is, shared by the visitors and signals pages. */

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** "GE" → "Georgia"; "Unknown" when there is no code. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Tbilisi, Georgia", or "" when neither is known. */
export function place(row: { city?: string | null; country?: string | null }): string {
  return [row.city, row.country ? countryName(row.country) : null].filter(Boolean).join(", ");
}

/** Marks a hosting or cloud network: a server, VPN or relay rather than a person's own line. */
export function CloudTag() {
  return (
    <span
      title="Hosting, cloud or platform network: usually a server, link preview, VPN or privacy relay rather than someone's own connection"
      className="shrink-0 rounded-full border border-line px-1.5 text-[10px] uppercase leading-4 tracking-wide text-faint"
    >
      server / VPN
    </span>
  );
}
