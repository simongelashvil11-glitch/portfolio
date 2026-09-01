import { deleteSkill } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { SkillForm } from "@/components/admin/skill-form";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { Mark } from "@/components/mark";
import { requireSession } from "@/lib/auth";
import { getSkills, groupSkills } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tech stack" };

export default async function AdminSkillsPage() {
  await requireSession();
  const rows = await getSkills();
  const groups = groupSkills(rows);
  const categories = [...new Set(rows.map((row) => row.category))];

  return (
    <>
      <PageHeading
        title="Tech stack"
        description="The tools listed on the about page. Add one below, or click any of them to change its name, logo, category or order."
      />

      <SkillForm categories={categories} />

      <div className="mt-8 grid gap-8">
        {groups.length === 0 ? (
          <EmptyState>No tools yet. Add your first one above.</EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 text-sm font-medium text-faint">{group.category}</h2>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <li
                    key={skill.id}
                    className="group flex items-center gap-1 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-1 text-sm transition-colors hover:border-accent"
                  >
                    <a
                      href={`/admin/skills/${skill.id}`}
                      className="flex items-center gap-2.5 pr-2 transition-colors hover:text-accent"
                    >
                      <Mark src={skill.logoUrl} label={skill.name} size="sm" />
                      {skill.name}
                    </a>
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
