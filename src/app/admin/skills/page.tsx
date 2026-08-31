import { deleteSkill } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { SkillForm } from "@/components/admin/skill-form";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getSkills, groupSkills } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Skills" };

export default async function AdminSkillsPage() {
  await requireSession();
  const rows = await getSkills();
  const groups = groupSkills(rows);
  const categories = [...new Set(rows.map((row) => row.category))];

  return (
    <>
      <PageHeading title="Skills" description="Grouped into categories in the Toolkit section." />

      <SkillForm categories={categories} />

      <div className="mt-8 grid gap-8">
        {groups.length === 0 ? (
          <EmptyState>No skills yet.</EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-faint">
                {group.category}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <li
                    key={skill.id}
                    className="flex items-center gap-1 rounded-full border border-line py-1 pl-3 pr-1 text-sm"
                  >
                    {skill.name}
                    <DeleteForm
                      action={deleteSkill}
                      id={skill.id}
                      confirmMessage={`Remove ${skill.name}?`}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
