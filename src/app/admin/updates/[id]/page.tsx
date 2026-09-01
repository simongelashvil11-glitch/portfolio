import { notFound } from "next/navigation";

import { UpdateForm } from "@/components/admin/update-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getUpdateById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit update" };

export default async function EditUpdatePage({ params }: PageProps<"/admin/updates/[id]">) {
  await requireSession();
  const { id } = await params;

  if (id === "new") {
    return (
      <>
        <PageHeading title="Add update" />
        <UpdateForm />
      </>
    );
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const update = await getUpdateById(numericId);
  if (!update) notFound();

  return (
    <>
      <PageHeading title="Edit update" description={update.title} />
      <UpdateForm update={update} />
    </>
  );
}
