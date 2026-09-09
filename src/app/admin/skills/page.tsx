import { deleteSkill, deleteTool } from "@/actions/admin";
import { DeleteForm } from "@/components/admin/delete-form";
import { SkillForm } from "@/components/admin/skill-form";
import { ToolForm } from "@/components/admin/tool-form";
import { EmptyState, PageHeading } from "@/components/admin/ui";
import { Mark } from "@/components/mark";
import { requireSession } from "@/lib/auth";
import { getSkills, getTools, groupSkills } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tech stack" };

export default async function AdminSkillsPage() {
  await requireSession();
  const [rows, toolRows] = await Promise.all([getSkills(), getTools()]);
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

      {/*
        Kept on this page rather than given a nav entry of its own: it is part
        of the Tech stack, and the menu is already long enough to have to be
        read rather than glanced at.
      */}
      <section className="mt-14 border-t border-line pt-10">
        <PageHeading
          title="Additional tools"
          description="A plain list behind a dropdown under the tools above. Name, website and one short line — no logos."
        />

        <ToolForm />

        <ul className="mt-8 grid gap-2">
          {toolRows.length === 0 ? (
            <EmptyState>No additional tools yet. Add your first one above.</EmptyState>
          ) : (
            toolRows.map((tool) => (
              <li
                key={tool.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface py-2 pl-4 pr-2 text-sm transition-colors hover:border-accent"
              >
                <a
                  href={`/admin/skills/tools/${tool.id}`}
                  className="min-w-0 flex-1 transition-colors hover:text-accent"
                >
                  <span className="font-medium">{tool.name}</span>
                  {tool.description ? (
                    <span className="text-muted"> &mdash; {tool.description}</span>
                  ) : null}
                </a>
                <DeleteForm
                  action={deleteTool}
                  id={tool.id}
                  confirmMessage={`Remove ${tool.name}?`}
                  compact
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
