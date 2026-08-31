import { notFound } from "next/navigation";

import { ExperienceForm } from "@/components/admin/experience-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getExperienceById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit experience" };

export default async function EditExperiencePage({
  params,
}: PageProps<"/admin/experience/[id]">) {
  await requireSession();
  const { id } = await params;

  if (id === "new") {
    return (
      <>
        <PageHeading title="Add role" />
        <ExperienceForm />
      </>
    );
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const experience = await getExperienceById(numericId);
  if (!experience) notFound();

  return (
    <>
      <PageHeading title="Edit role" description={`${experience.role} at ${experience.company}`} />
      <ExperienceForm experience={experience} />
    </>
  );
}
