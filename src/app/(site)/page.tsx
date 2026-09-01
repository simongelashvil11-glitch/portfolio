import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact-form";
import { Greeting } from "@/components/greeting";
import { Mark } from "@/components/mark";
import { Reveal } from "@/components/reveal";
import { VideoThumb } from "@/components/video";
import type { Project } from "@/db/schema";
import { getProfile, getProjects } from "@/lib/queries";

export const revalidate = 60;

const FALLBACK = {
  name: "Your Name",
  role: null,
  headline: "Digital marketing specialist.",
  bio: "Add your profile in the admin dashboard to replace this placeholder text.",
  location: null,
  email: null,
  availability: null,
  resumeUrl: null,
  socials: [] as { label: string; url: string }[],
};

export default async function HomePage() {
  const [profileRow, projects] = await Promise.all([getProfile(), getProjects()]);

  const profile = profileRow ?? FALLBACK;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 lg:px-12">
        {/* ---------- Hero ---------- */}
        <section className="pt-20 pb-28 sm:pt-28">
          <Reveal index={1}>
            <h1 className="font-display text-5xl leading-[1.05] tracking-display text-balance sm:text-7xl">
              <Greeting />
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
              {profile.headline}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{profile.bio}</p>
          </Reveal>

          {profile.resumeUrl ? (
            <Reveal index={3}>
              <div className="mt-8">
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-underline text-sm text-muted transition-colors hover:text-foreground"
                >
                  Résumé
                </a>
              </div>
            </Reveal>
          ) : null}
        </section>

        {/* ---------- Work ---------- */}
        {projects.length > 0 ? (
          <Section id="work" title="Selected work">
            <ul className="-mx-3">
              {projects.map((project, index) => (
                <Reveal
                  key={project.id}
                  index={index}
                  className="border-b border-line last:border-0"
                >
                  <li>
                    <ProjectRow project={project} />
                  </li>
                </Reveal>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* ---------- Experience ---------- */}
        <Section id="contact" title="Contact">
          <Reveal>
            <p className="mb-6 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
              Have something in mind? Send a note and I&apos;ll reply within a couple of days.
            </p>
            <ContactForm />
          </Reveal>
        </Section>
    </main>
  );
}

const ROW_CLASS =
  "group flex items-start justify-between gap-6 rounded-lg px-3 py-5 transition-colors hover:bg-surface";

/**
 * Links to the case-study page when the project has a long description,
 * otherwise straight out to the live site. A project with neither renders
 * as a plain, unlinked row.
 */
function ProjectRow({ project }: { project: Project }) {
  const row = <ProjectLink project={project} />;

  if (!project.videoUrl) return row;

  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">{row}</div>
      <VideoThumb url={project.videoUrl} title={project.title} />
    </div>
  );
}

function ProjectLink({ project }: { project: Project }) {
  const body = (
    <>
      <div className="flex min-w-0 items-start gap-3.5">
        <Mark src={project.logoUrl} label={project.title} className="mt-0.5" />

        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-base font-medium">
            {project.title}
            <ArrowUpRight className="size-3.5 shrink-0 text-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </h3>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{project.summary}</p>
          {project.tags.length > 0 ? (
            <p className="mt-2 text-sm text-faint">{project.tags.join(" · ")}</p>
          ) : null}
        </div>
      </div>
      {project.year ? (
        <span className="tnum mt-1 shrink-0 text-sm text-faint">{project.year}</span>
      ) : null}
    </>
  );

  if (project.description) {
    return (
      <Link href={`/projects/${project.slug}`} className={ROW_CLASS}>
        {body}
      </Link>
    );
  }

  if (project.url) {
    return (
      <a href={project.url} target="_blank" rel="noreferrer noopener" className={ROW_CLASS}>
        {body}
      </a>
    );
  }

  return <div className={ROW_CLASS}>{body}</div>;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-16 sm:py-20">
      <Reveal>
        <h2 className="mb-8 text-xl font-medium tracking-display">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}
