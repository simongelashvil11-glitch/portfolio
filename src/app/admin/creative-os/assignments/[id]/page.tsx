import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { deleteAssignment, saveAssignment } from "@/actions/creative-os";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { button, PageHeading } from "@/components/admin/ui";
import { AssignmentFields } from "@/components/creative-os/assignment-fields";
import { CosForm } from "@/components/creative-os/forms";
import { db } from "@/db";
import { cosAssignments, cosProjects } from "@/db/creative-os";

export const dynamic = "force-dynamic";

async function load(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [assignment] = await db.select().from(cosAssignments).where(eq(cosAssignments.id, id)).limit(1);
  if (!assignment) notFound();
  return assignment;
}

export async function generateMetadata({ params }: PageProps<"/admin/creative-os/assignments/[id]">) {
  return { title: (await load((await params).id)).title };
}

export default async function AssignmentPage({ params }: PageProps<"/admin/creative-os/assignments/[id]">) {
  const assignment = await load((await params).id);
  const projects = await db.select({ id: cosProjects.id, name: cosProjects.name }).from(cosProjects).orderBy(asc(cosProjects.name));
  return (
    <>
      <PageHeading title={assignment.title} description={assignment.client} />
      <div className="grid max-w-3xl gap-6">
        <CosForm action={saveAssignment} submitLabel="Save assignment">
          <input type="hidden" name="id" value={assignment.id} />
          <AssignmentFields assignment={assignment} projects={projects} />
        </CosForm>
        <ConfirmForm action={deleteAssignment} message={`Delete "${assignment.title}"? This cannot be undone.`}>
          <input type="hidden" name="id" value={assignment.id} />
          <button type="submit" className={button.danger}>
            Delete assignment
          </button>
        </ConfirmForm>
      </div>
    </>
  );
}
