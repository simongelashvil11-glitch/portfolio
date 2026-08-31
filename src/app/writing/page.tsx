import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPosts, getProfile } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on building for the web.",
};

export default async function WritingPage() {
  const [posts, profile] = await Promise.all([getPosts(), getProfile()]);
  const name = profile?.name ?? "Portfolio";

  return (
    <>
      <SiteHeader name={name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Reveal>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Writing</h1>
        </Reveal>

        {posts.length === 0 ? (
          <p className="mt-8 text-sm text-muted">Nothing published yet.</p>
        ) : (
          <ul className="mt-12 -mx-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} index={index} className="border-b border-line last:border-0">
                <li>
                  <Link
                    href={`/writing/${post.slug}`}
                    className="group block rounded-lg px-3 py-5 transition-colors hover:bg-surface"
                  >
                    <time className="tnum font-mono text-xs text-faint">
                      {formatDate(post.publishedAt)}
                    </time>
                    <h2 className="mt-1 text-base font-medium transition-colors group-hover:text-accent">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                    ) : null}
                  </Link>
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter name={name} socials={profile?.socials ?? []} />
    </>
  );
}
