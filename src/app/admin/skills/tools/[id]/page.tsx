import { notFound } from "next/navigation";

import { ToolForm } from "@/components/admin/tool-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getToolById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit tool" };

export default async function EditToolPage({ params }: PageProps<"/admin/skills/tools/[id]">) {
  await requireSession();
  const { id } = await params;

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const tool = await getToolById(numericId);
  if (!tool) notFound();

  return (
    <>
      <PageHeading title="Edit tool" description={tool.name} />
      <ToolForm tool={tool} />
    </>
  );
}
