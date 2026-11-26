import { saveProject } from "@/actions/creative-os";
import { ProjectFields } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/p/[projectId]">) {
  const project = await getProjectOr404((await params).projectId);
  return { title: project.name };
}

export default async function ProjectDetailsPage({ params }: PageProps<"/admin/creative-os/p/[projectId]">) {
  const project = await getProjectOr404((await params).projectId);
  return (
    <div className="max-w-3xl">
      <CosForm action={saveProject} submitLabel="Save project">
        <input type="hidden" name="id" value={project.id} />
        <ProjectFields project={project} />
      </CosForm>
    </div>
  );
}
