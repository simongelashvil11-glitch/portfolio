import Image from "next/image";
import Link from "next/link";

import { WhatsAppIcon, whatsAppHref } from "@/components/brand-icons";
import { ContactButton } from "@/components/contact-window";
import { Document, Mail } from "@/components/fluent-icons";
import { Greeting } from "@/components/greeting";
import { Mark } from "@/components/mark";
import { Reveal } from "@/components/reveal";
import { VideoCardPreview } from "@/components/video";
import type { Project } from "@/db/schema";
import { getProfile, getProjects } from "@/lib/queries";
import { youTubeId } from "@/lib/youtube";

export const revalidate = 60;

const FALLBACK = {
  name: "Your Name",
  role: null as string | null,
  headline: "Digital marketing specialist.",
  bio: "Add your profile in the admin dashboard to replace this placeholder text.",
  ticker: null as string | null,
  availability: null as string | null,
  whatsapp: null as string | null,
  portraitUrl: null as string | null,
  resumeUrl: null as string | null,
};

/** "Digital marketing • Content production" becomes a row of tags. */
function topics(ticker: string | null): string[] {
  return (ticker ?? "")
    .split(/[•·|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function HomePage() {
  const [profileRow, projects] = await Promise.all([getProfile(), getProjects()]);
  const profile = profileRow ?? FALLBACK;
  const tags = topics(profile.ticker);
  const portrait = profile.portraitUrl?.trim();
  const whatsapp = profile.whatsapp?.trim();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 lg:px-10 lg:py-12">
      {/* ---------- Page header ---------- */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <Reveal>
            <p className="text-sm text-faint">
              <Greeting />
            </p>
            {/* Fluent's Large Title: 40/52 semibold. */}
            <h1 className="mt-2 text-[28px] font-semibold leading-9 text-balance sm:text-[40px] sm:leading-[52px]">
              {profile.headline}
            </h1>
          </Reveal>

          <Reveal index={1}>
            <p className="mt-4 max-w-2xl text-base leading-[22px] text-muted">{profile.bio}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <ContactButton className="btn btn-primary">
                <Mail />
                Get in touch
              </ContactButton>
              <Link href={profile.resumeUrl || "/resume"} className="btn btn-secondary">
                <Document />
                View résumé
              </Link>
              {/*
                The profile card, which carries the WhatsApp button, is hidden
                below `lg` — and phones are where WhatsApp is. So it is here too,
                for them only.
              */}
              {whatsapp ? (
                <a
                  href={whatsAppHref(whatsapp)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-secondary lg:hidden"
                >
                  <WhatsAppIcon className="text-[#25d366]" />
                  WhatsApp
                </a>
              ) : null}
            </div>

            {tags.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="What I do">
                {tags.map((tag) => (
                  <li key={tag} className="tag">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </div>

        {/* ---------- Profile card ---------- */}
        {portrait ? (
          <Reveal index={2} className="hidden lg:block">
            <div className="card overflow-hidden">
              <div className="relative aspect-[4/5] bg-background">
                <Image
                  src={portrait}
                  alt={profile.name}
                  fill
                  sizes="240px"
                  priority
                  className="object-cover object-top"
                />
              </div>
              <div className="border-t border-line p-3">
                <p className="text-sm font-semibold">{profile.name}</p>
                {profile.role ? <p className="text-xs text-faint">{profile.role}</p> : null}
                {profile.availability ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    {/* Fluent's "available" presence badge. */}
                    {/* As wide as the WhatsApp mark below, so both labels start together. */}
                    <span className="flex w-3.5 shrink-0" aria-hidden>
                      <span className="size-2.5 rounded-full bg-[#13a10e] ring-2 ring-white" />
                    </span>
                    {profile.availability}
                  </p>
                ) : null}
                {whatsapp ? (
                  /*
                    One more line of the card rather than a button in it: left
                    aligned with the lines above, the logo where the status
                    dot sits, the label in Fluent's link colour.
                  */
                  <a
                    href={whatsAppHref(whatsapp)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1.5 flex w-fit items-center gap-1.5 text-xs font-semibold text-accent-hover hover:underline"
                  >
                    <WhatsAppIcon className="size-3.5 shrink-0 text-[#25d366]" />
                    Chat on WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </Reveal>
        ) : null}
      </section>

      {/* ---------- Work ---------- */}
      {projects.length > 0 ? (
        <section id="work" className="scroll-mt-24 pt-14">
          <Reveal>
            <div className="mb-5 flex items-center gap-2.5">
              {/* Fluent's Title 3: 24/32 semibold. */}
              <h2 className="text-2xl font-semibold leading-8">Selected work</h2>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-hover">
                {projects.length}
              </span>
            </div>
          </Reveal>

          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <Reveal key={project.id} index={index}>
                <li className="h-full">
                  <WorkCard project={project} />
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

/** Where a card opens: the case study (text or figures), else the live site, else nowhere. */
function destination(project: Project): { href: string; external: boolean } | null {
  if (project.description || project.stats.length > 0 || project.campaigns.length > 0) return { href: `/projects/${project.slug}`, external: false };
  if (project.url) return { href: project.url, external: true };
  return null;
}

/**
 * A project, as a Fluent card: the preview across the top, then the mark,
 * title and summary. The whole card is the link, by stretching the title's
 * link over it; the video preview sits above that so it still plays.
 */
function WorkCard({ project }: { project: Project }) {
  const target = destination(project);
  const hasVideo = Boolean(project.videoUrl && youTubeId(project.videoUrl));

  const stretch = "after:absolute after:inset-0 after:rounded-[8px] after:content-['']";
  const title = target ? (
    target.external ? (
      <a href={target.href} target="_blank" rel="noreferrer noopener" className={stretch}>
        {project.title}
      </a>
    ) : (
      <Link href={target.href} className={stretch}>
        {project.title}
      </Link>
    )
  ) : (
    project.title
  );

  return (
    <article className={`card relative flex h-full flex-col overflow-hidden ${target ? "card-interactive" : ""}`}>
      {hasVideo ? (
        <VideoCardPreview url={project.videoUrl!} title={project.title} posterUrl={project.imageUrl} />
      ) : project.imageUrl ? (
        <div className="relative aspect-video bg-surface">
          <Image src={project.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover" />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <Mark src={project.logoUrl} label={project.title} />
          <div className="min-w-0 flex-1">
            {/* Fluent's Subtitle 2: 16/22 semibold. */}
            <h3 className="text-base font-semibold leading-[22px]">{title}</h3>
            {project.year ? <p className="tnum text-xs text-faint">{project.year}</p> : null}
          </div>
        </div>

        <p className="mt-3 text-sm text-muted">{project.summary}</p>

        {project.tags.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {project.tags.map((tag) => (
              <li key={tag} className="tag min-h-6 px-1.5 py-0.5 text-xs">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
