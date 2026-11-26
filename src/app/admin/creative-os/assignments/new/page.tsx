import { asc, eq } from "drizzle-orm";

import { saveAssignment } from "@/actions/creative-os";
import { PageHeading } from "@/components/admin/ui";
import { AssignmentFields } from "@/components/creative-os/assignment-fields";
import { CosForm } from "@/components/creative-os/forms";
import { db } from "@/db";
import { cosProjects } from "@/db/creative-os";

export const dynamic = "force-dynamic";
export const metadata = { title: "New assignment" };

export default async function NewAssignmentPage() {
  const projects = await db
    .select({ id: cosProjects.id, name: cosProjects.name })
    .from(cosProjects)
    .where(eq(cosProjects.status, "active"))
    .orderBy(asc(cosProjects.name));
  return (
    <>
      <PageHeading title="New assignment" />
      <div className="max-w-3xl">
        <CosForm action={saveAssignment} submitLabel="Create assignment" pendingLabel="Creating…">
          <AssignmentFields projects={projects} />
        </CosForm>
      </div>
    </>
  );
}
