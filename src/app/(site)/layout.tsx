import { SiteFooter } from "@/components/site-footer";
import { SiteSidebar } from "@/components/site-sidebar";
import { getProfile } from "@/lib/queries";

export const revalidate = 60;

/**
 * Shell for every public page.
 *
 * One gradient covers the whole viewport and everything sits on top of it:
 * the sidebar is transparent, and the content is an inset rounded panel, so
 * the page reads as a tab docked into the sidebar rather than a column
 * bolted beside it. Below `lg` the panel goes full-bleed under a frosted bar.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();
  const name = profile?.name ?? "Portfolio";

  return (
    <div className="flex min-h-full flex-1 flex-col lg:pl-(--sidebar-width)">
      {/* The shell. Fixed, so it never scrolls out from behind the panel. */}
      <div className="aurora fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <span className="smoke smoke-a" />
        <span className="smoke smoke-b" />
      </div>

      <SiteSidebar
        name={name}
        role={profile?.role ?? null}
        email={profile?.email ?? null}
        socials={profile?.socials ?? []}
      />

      <div className="flex flex-1 flex-col bg-background lg:m-2.5 lg:rounded-2xl lg:border lg:border-white/8 lg:shadow-[0_24px_70px_-32px_rgb(0_0_0/0.9)]">
        {children}
        <SiteFooter name={name} socials={profile?.socials ?? []} />
      </div>
    </div>
  );
}
