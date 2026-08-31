import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact-form";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { Project } from "@/db/schema";
import {
  getExperiences,
  getProfile,
  getProjects,
  getSkills,
  groupSkills,
} from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const revalidate = 60;

const FALLBACK = {
  name: "Your Name",
  headline: "Designer and developer.",
  bio: "Add your profile in the admin dashboard to replace this placeholder text.",
  location: null,
  email: null,
  availability: null,
  resumeUrl: null,
  socials: [] as { label: string; url: string }[],
};

export default async function HomePage() {
  const [profileRow, experiences, projects, skillRows] = await Promise.all([
    getProfile(),
    getExperiences(),
    getProjects(),
    getSkills(),
  ]);

  const profile = profileRow ?? FALLBACK;
  const skillGroups = groupSkills(skillRows);

  return (
    <>
      <SiteHeader name={profile.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6">
        {/* ---------- Hero ---------- */}
        <section className="pt-20 pb-28 sm:pt-28">
          <Reveal>
            {profile.availability ? (
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
                </span>
                {profile.availability}
              </p>
            ) : null}
          </Reveal>

          <Reveal index={1}>
            <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-6xl">
              {profile.headline}
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">{profile.bio}</p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              {profile.email ? (
                <a
                  href={`mailto:${profile.email}`}
                  className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
                >
                  Get in touch
                </a>
              ) : null}
              {profile.socials.map((social) => (
                <a
                  key={social.url}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-underline font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </Reveal>
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
        {experiences.length > 0 ? (
          <Section id="experience" title="Experience">
            <ol className="grid gap-10">
              {experiences.map((item, index) => (
                <Reveal key={item.id} index={index}>
                  <li className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
                    <p className="tnum pt-0.5 font-mono text-xs text-faint">
                      {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                    </p>
                    <div>
                      <h3 className="text-base font-medium">
                        {item.role}
                        <span className="text-muted"> · </span>
                        {item.companyUrl ? (
                          <a
                            href={item.companyUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="link-underline text-accent"
                          >
                            {item.company}
                          </a>
                        ) : (
                          <span className="text-muted">{item.company}</span>
                        )}
                      </h3>
                      {item.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {item.description}
                        </p>
                      ) : null}
                      {item.highlights.length > 0 ? (
                        <ul className="mt-3 grid gap-1.5">
                          {item.highlights.map((highlight) => (
                            <li
                              key={highlight}
                              className="relative pl-4 text-sm leading-relaxed text-muted before:absolute before:left-0 before:top-2.5 before:size-1 before:rounded-full before:bg-accent"
                            >
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </Section>
        ) : null}

        {/* ---------- Toolkit ---------- */}
        {skillGroups.length > 0 ? (
          <Section id="about" title="Toolkit">
            <div className="grid gap-8 sm:grid-cols-2">
              {skillGroups.map((group, index) => (
                <Reveal key={group.category} index={index}>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-faint">
                    {group.category}
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {group.items.map((skill) => (
                      <li
                        key={skill.id}
                        className="rounded-full border border-line px-3 py-1 text-sm text-muted"
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ---------- Contact ---------- */}
        <Section id="contact" title="Contact">
          <Reveal>
            <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted">
              Have something in mind? Send a note and I&apos;ll reply within a couple of days.
            </p>
            <ContactForm />
          </Reveal>
        </Section>
      </main>

      <SiteFooter name={profile.name} socials={profile.socials} />
    </>
  );
}

const ROW_CLASS =
  "group flex items-baseline justify-between gap-6 rounded-lg px-3 py-5 transition-colors hover:bg-surface";

/**
 * Links to the case-study page when the project has a long description,
 * otherwise straight out to the live site. A project with neither renders
 * as a plain, unlinked row.
 */
function ProjectRow({ project }: { project: Project }) {
  const body = (
    <>
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-base font-medium">
          {project.title}
          <ArrowUpRight className="size-3.5 shrink-0 text-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{project.summary}</p>
        {project.tags.length > 0 ? (
          <p className="mt-2 font-mono text-xs text-faint">{project.tags.join(" · ")}</p>
        ) : null}
      </div>
      {project.year ? (
        <span className="tnum shrink-0 font-mono text-xs text-faint">{project.year}</span>
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
        <h2 className="mb-10 font-mono text-xs uppercase tracking-[0.2em] text-faint">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}
