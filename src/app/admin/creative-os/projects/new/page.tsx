import { createProject } from "@/actions/creative-os";
import { PageHeading } from "@/components/admin/ui";
import { ProjectFields } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeading title="New project" description="One brand or client. Everything you research for it lives inside the project." />
      <div className="max-w-3xl">
        <CosForm action={createProject} submitLabel="Create project" pendingLabel="Creating…">
          <ProjectFields />
        </CosForm>
      </div>
    </>
  );
}
