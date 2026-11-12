import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRight, Code, Open } from "@/components/fluent-icons";
import { Gallery } from "@/components/gallery";
import { ProjectStats } from "@/components/project-stats";
import { Prose } from "@/components/prose";
import { Reveal } from "@/components/reveal";
import { VideoPoster } from "@/components/video";
import { getProjectBySlug, getProjects } from "@/lib/queries";

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
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 lg:px-10 lg:py-10">
      {/* Fluent's Breadcrumb. */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-faint">
          <li>
            <Link href="/" className="rounded-[4px] px-1.5 py-1 transition-colors hover:bg-surface hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3" />
          </li>
          <li>
            <Link href="/#work" className="rounded-[4px] px-1.5 py-1 transition-colors hover:bg-surface hover:text-foreground">
              Work
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3" />
          </li>
          <li aria-current="page" className="max-w-[16rem] truncate px-1.5 font-semibold text-foreground">
            {project.title}
          </li>
        </ol>
      </nav>

      <Reveal>
        <header className="mt-6">
          {/* Fluent's Title 1: 32/40 semibold. */}
          <h1 className="text-[28px] font-semibold leading-9 text-balance sm:text-[32px] sm:leading-10">
            {project.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-[22px] text-muted">{project.summary}</p>

          {project.year || project.tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.year ? <li className="tag tnum">{project.year}</li> : null}
              {project.tags.map((tag) => (
                <li key={tag} className="tag">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          {project.url || project.repoUrl ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.url ? (
                <a href={project.url} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
                  <Open />
                  Visit site
                </a>
              ) : null}
              {project.repoUrl ? (
                <a href={project.repoUrl} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
                  <Code />
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
          <div className="mt-8">
            <VideoPoster url={project.videoUrl} title={project.title} posterUrl={project.imageUrl} />
          </div>
        </Reveal>
      ) : project.imageUrl ? (
        <Reveal index={1}>
          <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[8px] bg-surface">
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          </div>
        </Reveal>
      ) : null}

      {project.stats.length > 0 || project.campaigns.length > 0 ? (
        <Reveal index={2}>
          <div className="mt-8">
            <ProjectStats
              title={project.statsTitle}
              note={project.statsNote}
              stats={project.stats}
              campaignsTitle={project.campaignsTitle}
              campaigns={project.campaigns}
            />
          </div>
        </Reveal>
      ) : null}

      {project.description ? (
        <Reveal index={2}>
          <div className="mt-10 max-w-2xl text-base leading-[22px]">
            <Prose content={project.description} />
          </div>
        </Reveal>
      ) : null}

      {project.gallery.length > 0 ? (
        <Reveal index={3}>
          <div className="mt-10">
            <h2 className="mb-4 text-xl font-semibold leading-7">Gallery</h2>
            <Gallery images={project.gallery} title={project.title} />
          </div>
        </Reveal>
      ) : null}
    </main>
  );
}
