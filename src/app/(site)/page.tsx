import Image from "next/image";
import Link from "next/link";

import { WhatsAppIcon, whatsAppHref } from "@/components/brand-icons";
import { ContactButton } from "@/components/contact-window";
import { Document, Mail, Open } from "@/components/fluent-icons";
import { Greeting } from "@/components/greeting";
import { HeyButton } from "@/components/hey-button";
import { Mark } from "@/components/mark";
import { ProjectPicture } from "@/components/page-transition";
import { ProjectStats } from "@/components/project-stats";
import { Reveal } from "@/components/reveal";
import { Showreel } from "@/components/showreel";
import { VideoCardPreview } from "@/components/video";
import { NewsMark } from "@/components/window";
import type { Project } from "@/db/schema";
import { getProfile, getProjects } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";
import { youTubeId } from "@/lib/youtube";

export const revalidate = 60;

// The homepage is the one address for the site's root; other pages keep their own.
export const metadata = { alternates: { canonical: "/" } };

/** What search engines are told the person works on (schema.org `knowsAbout`). */
const KNOWS_ABOUT = ["Digital Marketing", "Meta Ads", "Video Production", "E-commerce"];

/**
 * schema.org Person data for search engines, built from the profile row.
 * `<` is escaped so text from the admin can never close the script tag.
 */
function personJsonLd(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>): string {
  const absolute = (url: string | null | undefined) =>
    url ? (url.startsWith("/") ? `${siteUrl}${url}` : url) : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role?.trim() || "Digital Marketer",
    description: profile.headline,
    url: siteUrl,
    image: absolute(profile.portraitUrl?.trim()),
    ...(profile.location?.trim()
      ? { address: { "@type": "PostalAddress", addressLocality: profile.location.trim() } }
      : {}),
    sameAs: profile.socials.map((social) => social.url).filter((url) => /^https?:\/\//.test(url)),
    knowsAbout: KNOWS_ABOUT,
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
  /*
   * The results preview shows the first project in Work order that has
   * figures. Reordering the work list in the admin changes which one.
   */
  const showcase = projects.find((project) => project.stats.length > 0);
  /** The first article in any project's press list, in Work order. */
  const mention = projects.flatMap((project) => project.press)[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 lg:px-10 lg:py-12">
      {profileRow ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd(profileRow) }} />
      ) : null}
      {/* ---------- Page header ---------- */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        {/*
          min-w-0: a grid item will not shrink below its content by default,
          and the one-line press strip below is as wide as its full text. On
          a phone that widened this whole column past the screen and pushed
          the heading, the text and the buttons off the right edge.
        */}
        <div className="min-w-0">
          <Reveal>
            {/*
              The greeting, and below `lg` (where the profile card and its Hey
              button are hidden) a Hey of its own beside it, so it waves back.
            */}
            <div className="flex min-h-7 items-center gap-3">
              <p className="text-sm text-faint">
                <Greeting />
              </p>
              {whatsapp ? <HeyButton phone={whatsapp} name={profile.name} className="lg:hidden" /> : null}
            </div>
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

            {/*
              Press, as one slim line on the shell's gradient: the same
              title-bar treatment as the windows below, so it reads as part
              of the set rather than a badge stuck on.
            */}
            {mention ? (
              <a
                href={mention.url}
                target="_blank"
                rel="noreferrer noopener"
                title={mention.title}
                className="shell-bg group relative mt-6 flex w-fit max-w-full items-center gap-2.5 rounded-[8px] border border-line py-2 pl-3 pr-3.5 text-sm shadow-fluent-2 transition-shadow duration-150 hover:shadow-fluent-8"
              >
                <span className="flex shrink-0 text-xl text-lavender">
                  <NewsMark />
                </span>
                <span className="min-w-0 truncate">
                  <span className="text-muted">Featured in </span>
                  <span className="font-semibold">{mention.outlet}</span>
                  {/* The date waits for room; on a phone the line stays short. */}
                  {mention.date ? <span className="hidden text-faint sm:inline"> · {mention.date}</span> : null}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-hover group-hover:underline sm:ml-1">
                  {/* On a phone the arrow alone says "opens elsewhere"; the word waits for room. */}
                  <span className="hidden sm:inline">Read</span>
                  <Open className="size-3.5" />
                </span>
              </a>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{profile.name}</p>
                    {profile.role ? <p className="text-xs text-faint">{profile.role}</p> : null}
                  </div>
                  {whatsapp ? <HeyButton phone={whatsapp} name={profile.name} className="mt-0.5 shrink-0" /> : null}
                </div>
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

      {/* ---------- Showreel, once one is set in the profile ---------- */}
      {profileRow?.showreelUrl ? (
        <section className="pt-10" aria-label="Showreel">
          <Showreel url={profileRow.showreelUrl} name={profile.name} />
        </section>
      ) : null}

      {/* ---------- Results preview ---------- */}
      {showcase ? (
        <section className="pt-14">
          <Reveal>
            <ProjectStats
              title={showcase.statsTitle}
              note={showcase.statsNote}
              stats={showcase.stats}
              campaignsTitle={null}
              campaigns={[]}
              peek={{ project: showcase.title, href: `/projects/${showcase.slug}` }}
            />
          </Reveal>
        </section>
      ) : null}

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
      <Link href={target.href} transitionTypes={["to-project"]} className={stretch}>
        {project.title}
      </Link>
    )
  ) : (
    project.title
  );

  return (
    <article className={`card relative flex h-full flex-col overflow-hidden ${target ? "card-interactive" : ""}`}>
      {/* Named so it morphs into the top of the project's page (components/page-transition). */}
      {hasVideo ? (
        <ProjectPicture slug={project.slug}>
          {/* No positioning here: the player's dialog inside must not be trapped in a stacking context. */}
          <div>
            <VideoCardPreview
              url={project.videoUrl!}
              title={project.title}
              posterUrl={project.imageUrl}
              previewUrl={project.previewUrl}
            />
          </div>
        </ProjectPicture>
      ) : project.imageUrl ? (
        <ProjectPicture slug={project.slug}>
          <div className="relative aspect-video bg-surface">
            <Image src={project.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover" />
          </div>
        </ProjectPicture>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <Mark src={project.logoUrl} label={project.title} fallback="work" />
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
