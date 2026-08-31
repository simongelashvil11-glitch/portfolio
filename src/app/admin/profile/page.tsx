import { ProfileForm } from "@/components/admin/profile-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Profile" };

export default async function AdminProfilePage() {
  await requireSession();
  const profile = await getProfile();

  return (
    <>
      <PageHeading
        title="Profile"
        description="The name, headline and bio that open the site."
      />
      <ProfileForm profile={profile} />
    </>
  );
}
