import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRight, Code, Open } from "@/components/fluent-icons";
import { Gallery } from "@/components/gallery";
import { ProjectPicture } from "@/components/page-transition";
import { ProjectPress } from "@/components/project-press";
import { ProjectStats } from "@/components/project-stats";
import { Prose } from "@/components/prose";
import { Reveal } from "@/components/reveal";
import { VideoPoster } from "@/components/video";
import { ImageMark, TextMark, Window } from "@/components/window";
import { ProjectEnding } from "@/components/project-ending";
import { getProfile, getProjectBySlug, getProjects } from "@/lib/queries";
import { projectJsonLd } from "@/lib/seo";

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

  // The share picture is this folder's opengraph-image.tsx: the project's own card.
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
      url: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const [project, projects, profile] = await Promise.all([getProjectBySlug(slug), getProjects(), getProfile()]);

  if (!project) notFound();

  // The next case study in the homepage's order, wrapping round; only ones with a page of their own.
  const withPages = projects.filter(
    (item) => item.description || item.stats.length > 0 || item.campaigns.length > 0,
  );
  const at = withPages.findIndex((item) => item.id === project.id);
  const next = withPages.length > 1 ? withPages[(at + 1) % withPages.length] : null;

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
      {/*
        Not in a Reveal: the picture is the other end of the homepage card's
        morph (components/page-transition), and a Reveal can hold it hidden
        while it waits to scroll in, so the morph would land on nothing.
      */}
      {project.videoUrl ? (
        <div className="mt-8">
          <ProjectPicture slug={project.slug}>
            <div>
              <VideoPoster url={project.videoUrl} title={project.title} posterUrl={project.imageUrl} />
            </div>
          </ProjectPicture>
        </div>
      ) : project.imageUrl ? (
        <ProjectPicture slug={project.slug}>
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
        </ProjectPicture>
      ) : null}

      {/* Coverage first: the independent word on the work, before the detail. */}
      {project.press.length > 0 ? (
        <Reveal index={2}>
          <div className="mt-8">
            <ProjectPress press={project.press} />
          </div>
        </Reveal>
      ) : null}

      {project.stats.length > 0 || project.campaigns.length > 0 ? (
        <Reveal index={2}>
          <div className="mt-6">
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

      {/*
        The text and the gallery are windows like the statistics, so the
        page reads as one set of panels rather than panels and loose parts.
      */}
      {project.description ? (
        <Reveal index={2}>
          <div className="mt-6">
            <Window id="case-study-title" title="Case study" icon={<TextMark />} bodyClassName="sm:py-7">
              <div className="max-w-[68ch] text-base leading-6">
                <Prose content={project.description} />
              </div>
            </Window>
          </div>
        </Reveal>
      ) : null}

      {project.gallery.length > 0 ? (
        <Reveal index={3}>
          <div className="mt-6">
            <Window
              id="gallery-title"
              title="Gallery"
              icon={<ImageMark />}
              aside={`${project.gallery.length} ${project.gallery.length === 1 ? "image" : "images"} · select one to enlarge`}
            >
              <Gallery images={project.gallery} title={project.title} />
            </Window>
          </div>
        </Reveal>
      ) : null}

      <ProjectEnding next={next} availability={profile?.availability?.trim() || null} whatsapp={profile?.whatsapp?.trim() || null} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: projectJsonLd(project, profile) }} />
    </main>
  );
}
