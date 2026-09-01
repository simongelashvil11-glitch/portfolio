import { ArrowLeft, Code2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/gallery";
import { Reveal } from "@/components/reveal";
import { VideoPoster } from "@/components/video";
import { getProfile, getProjectBySlug, getProjects } from "@/lib/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Not found" };

  return {
    title: project.title,
    description: project.summary,
    openGraph: {
      title: project.title,
      description: project.summary,
      images: project.imageUrl ? [project.imageUrl] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, profile] = await Promise.all([getProjectBySlug(slug), getProfile()]);

  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-12">
      <Link
        href="/#work"
        className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        {profile?.name ?? "Back"}
      </Link>

      <Reveal>
        <header className="mt-10 border-b border-line pb-10">
          <p className="tnum text-sm text-faint">
            {[project.year, ...project.tags].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-display text-balance sm:text-5xl">
            {project.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{project.summary}</p>

          {project.url || project.repoUrl ? (
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {project.url ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-75"
                >
                  <ExternalLink className="size-3.5" />
                  Visit site
                </a>
              ) : null}
              {project.repoUrl ? (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  <Code2 className="size-3.5" />
                  Source
                </a>
              ) : null}
            </div>
          ) : null}
        </header>
      </Reveal>

      {/*
        A video takes the lead when there is one — it reuses the cover image
        as its poster, so setting both loses nothing.
      */}
      {project.videoUrl ? (
        <Reveal index={1}>
          <VideoPoster
            url={project.videoUrl}
            title={project.title}
            posterUrl={project.imageUrl}
          />
        </Reveal>
      ) : project.imageUrl ? (
        <Reveal index={1}>
          <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface">
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        </Reveal>
      ) : null}

      {project.gallery.length > 0 ? (
        <Reveal index={2}>
          <Gallery images={project.gallery} title={project.title} />
        </Reveal>
      ) : null}

      {project.description ? (
        <Reveal index={3}>
          {/* Paragraphs are split on blank lines, so the admin textarea stays plain text. */}
          <div className="mt-12 grid gap-5">
            {project.description
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed text-muted">
                  {paragraph}
                </p>
              ))}
          </div>
        </Reveal>
      ) : null}
    </main>
  );
}
