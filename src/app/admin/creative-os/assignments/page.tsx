import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { button, Card, EmptyState, PageHeading } from "@/components/admin/ui";
import { ASSIGNMENT_STATUS_LABEL } from "@/components/creative-os/assignment-fields";
import { Add } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosAssignments, cosProjects } from "@/db/creative-os";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  const rows = await db
    .select({ assignment: cosAssignments, project: cosProjects.name })
    .from(cosAssignments)
    .leftJoin(cosProjects, eq(cosProjects.id, cosAssignments.projectId))
    .orderBy(
      sql`case ${cosAssignments.status} when 'open' then 0 when 'submitted' then 1 when 'done' then 2 else 3 end`,
      sql`${cosAssignments.deadline} asc nulls last`,
      desc(cosAssignments.updatedAt),
    );

  return (
    <>
      <PageHeading
        title="Assignments"
        description="Test tasks and client briefs, with their deadlines and what they will be judged on. The guided assignment workflow arrives in Phase 4."
        action={
          <Link href="/admin/creative-os/assignments/new" className={button.primary}>
            <Add />
            New assignment
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState>No assignments yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ assignment, project }) => (
            <li key={assignment.id}>
              <Link href={`/admin/creative-os/assignments/${assignment.id}`} className="block">
                <Card className="card-interactive">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{assignment.title}</p>
                    <span className="text-xs text-faint">
                      {ASSIGNMENT_STATUS_LABEL[assignment.status] ?? assignment.status}
                      {assignment.deadline ? ` · due ${assignment.deadline}` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {assignment.client}
                    {project ? ` · ${project}` : ""}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
