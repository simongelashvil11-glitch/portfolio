import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Prose } from "@/components/prose";
import { Reveal } from "@/components/reveal";
import { getPostBySlug, getPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export default async function PostPage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-12">
      <Link
        href="/writing"
        className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Writing
      </Link>

      <Reveal>
        <header className="mt-10">
          <time className="tnum text-sm text-faint">
            {formatDate(post.publishedAt)}
          </time>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-display text-balance">
            {post.title}
          </h1>
        </header>
      </Reveal>

      <Reveal index={1}>
        <article className="mt-10">
          <Prose content={post.content} />
        </article>
      </Reveal>
    </main>
  );
}
