import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getProjectById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  await requireSession();
  const { id } = await params;

  if (id === "new") {
    return (
      <>
        <PageHeading title="Add project" />
        <ProjectForm />
      </>
    );
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const project = await getProjectById(numericId);
  if (!project) notFound();

  return (
    <>
      <PageHeading title="Edit project" description={project.title} />
      <ProjectForm project={project} />
    </>
  );
}
