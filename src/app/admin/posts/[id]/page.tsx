import { notFound } from "next/navigation";

import { PostForm } from "@/components/admin/post-form";
import { PageHeading } from "@/components/admin/ui";
import { requireSession } from "@/lib/auth";
import { getPostById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  await requireSession();
  const { id } = await params;

  if (id === "new") {
    return (
      <>
        <PageHeading title="New post" />
        <PostForm />
      </>
    );
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const post = await getPostById(numericId);
  if (!post) notFound();

  return (
    <>
      <PageHeading title="Edit post" description={post.title} />
      <PostForm post={post} />
    </>
  );
}
