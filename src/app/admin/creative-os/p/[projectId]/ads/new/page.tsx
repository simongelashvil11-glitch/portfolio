import { saveAd } from "@/actions/creative-os";
import { AdFields } from "@/components/creative-os/ad-fields";
import { CosForm } from "@/components/creative-os/forms";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const metadata = { title: "Add an ad" };

export default async function NewAdPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/ads/new">) {
  const project = await getProjectOr404((await params).projectId);
  return (
    <div className="max-w-3xl">
      <h2 className="mb-4 text-xl font-semibold leading-7">Add an ad</h2>
      <CosForm action={saveAd} submitLabel="Save ad">
        <input type="hidden" name="projectId" value={project.id} />
        <AdFields />
      </CosForm>
      <p className="mt-3 text-xs text-faint">Screenshots can be added after saving.</p>
    </div>
  );
}
