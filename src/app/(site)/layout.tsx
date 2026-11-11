import { SiteFooter } from "@/components/site-footer";
import { SiteSidebar } from "@/components/site-sidebar";
import { getProfile } from "@/lib/queries";

export const revalidate = 60;

/**
 * Shell for every public page, after a Fluent 2 web app: the nav drawer and
 * the app chrome share Fluent's pale grey, and the page itself is a white
 * panel with rounded corners set into it, as the newer Microsoft 365 apps
 * lay out their content. Below `lg` the panel goes full-bleed under an app bar.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();
  const name = profile?.name ?? "Simon Gelashvili";

  return (
    <div className="flex min-h-full flex-1 flex-col lg:pl-(--sidebar-width)">
      {/* The chrome's gradient, behind the sidebar and around the panel. */}
      <div className="shell-bg fixed inset-0 -z-10" aria-hidden />

      <SiteSidebar
        name={name}
        role={profile?.role ?? null}
        email={profile?.email ?? null}
        portraitUrl={profile?.portraitUrl?.trim() || null}
        socials={profile?.socials ?? []}
      />

      <div className="flex flex-1 flex-col bg-background lg:my-2 lg:mr-2 lg:rounded-[8px] lg:shadow-fluent-4">
        {children}
        <SiteFooter name={name} socials={profile?.socials ?? []} />
      </div>
    </div>
  );
}
