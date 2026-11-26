import { Open } from "@/components/fluent-icons";
import Link from "next/link";

import { AboutForm } from "@/components/admin/about-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "About page" };

export default async function AdminAboutPage() {
  await requireSession();
  const profile = await getProfile();

  return (
    <>
      <PageHeading
        title="About page"
        description="Every heading and paragraph on /about. The lists on it are edited under Updates, Skills and Experience."
        action={
          <Link
            href="/about"
            className="btn btn-secondary"
          >
            View page
            <Open />
          </Link>
        }
      />

      <AboutForm profile={profile} />
    </>
  );
}
