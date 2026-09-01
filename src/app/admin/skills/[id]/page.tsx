import { notFound } from "next/navigation";

import { SkillForm } from "@/components/admin/skill-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getSkillById, getSkills } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit skill" };

export default async function EditSkillPage({ params }: PageProps<"/admin/skills/[id]">) {
  await requireSession();
  const { id } = await params;

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const [skill, rows] = await Promise.all([getSkillById(numericId), getSkills()]);
  if (!skill) notFound();

  const categories = [...new Set(rows.map((row) => row.category))];

  return (
    <>
      <PageHeading title="Edit skill" description={skill.name} />
      <SkillForm categories={categories} skill={skill} />
    </>
  );
}
