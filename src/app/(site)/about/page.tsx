import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import { Mark } from "@/components/mark";
import { Prose } from "@/components/prose";
import { Reveal } from "@/components/reveal";
import {
  getExperiences,
  getProfile,
  getSkills,
  getUpdates,
  groupSkills,
} from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();

  return {
    title: "About",
    description: profile?.headline ?? "About me.",
  };
}

export default async function AboutPage() {
  const [profile, updates, skillRows, experiences] = await Promise.all([
    getProfile(),
    getUpdates(),
    getSkills(),
    getExperiences(),
  ]);

  const skillGroups = groupSkills(skillRows);

  // Every heading falls back rather than rendering blank, and the intro
  // borrows the bio until it is written, so the page is never empty.
  const body = profile?.about?.trim() || profile?.bio || "";
  const title = profile?.aboutTitle?.trim() || "About";
  const updatesHeading = profile?.updatesHeading?.trim() || "Personal updates";
  const techHeading = profile?.techHeading?.trim() || "Tech stack";
  const careerHeading = profile?.careerHeading?.trim() || "Career";
  const techIntro = profile?.techIntro?.trim();
  const careerIntro = profile?.careerIntro?.trim();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-12">
      <Reveal>
        <h1 className="font-display text-4xl tracking-display sm:text-5xl">{title}</h1>
      </Reveal>

      {body ? (
        <Reveal index={1}>
          <div className="mt-8">
            <Prose content={body} />
          </div>
        </Reveal>
      ) : null}

      {updates.length > 0 ? (
        <section className="mt-20">
          <Reveal>
            <h2 className="text-xl font-medium tracking-display">{updatesHeading}</h2>
          </Reveal>

          <ul className="mt-8">
            {updates.map((update, index) => (
              <Reveal
                key={update.id}
                index={index}
                className="border-b border-line last:border-0"
              >
                <li className="group flex items-start gap-4 py-5">
                  <Mark src={update.logoUrl} label={update.title} className="mt-0.5" />

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium">
                      {update.url ? (
                        <a
                          href={update.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-baseline gap-1.5 transition-colors hover:text-accent"
                        >
                          <span className="link-underline">{update.title}</span>
                          <ArrowUpRight className="size-3.5 shrink-0 self-center text-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                        </a>
                      ) : (
                        update.title
                      )}
                    </h3>

                    {update.description ? (
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
                        {update.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="tnum shrink-0 pt-0.5 text-sm text-faint">
                    {formatPeriod(update.date)}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {skillGroups.length > 0 ? (
        <section className="mt-20">
          <Reveal>
            <h2 className="text-xl font-medium tracking-display">{techHeading}</h2>
            {techIntro ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{techIntro}</p>
            ) : null}
          </Reveal>

          <div className="mt-8 grid gap-7">
            {skillGroups.map((group, index) => (
              <Reveal key={group.category} index={index}>
                <h3 className="text-sm font-medium text-faint">{group.category}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <li
                      key={skill.id}
                      className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-sm transition-colors hover:border-white/20"
                    >
                      <Mark src={skill.logoUrl} label={skill.name} size="sm" />
                      {skill.name}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {experiences.length > 0 ? (
        <section className="mt-20">
          <Reveal>
            <h2 className="text-xl font-medium tracking-display">{careerHeading}</h2>
            {careerIntro ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{careerIntro}</p>
            ) : null}
          </Reveal>

          <ol className="mt-8">
            {experiences.map((item, index) => (
              <Reveal
                key={item.id}
                index={index}
                className="border-b border-line last:border-0"
              >
                <li className="group flex items-start gap-4 py-5">
                  <Mark src={item.logoUrl} label={item.company} className="mt-0.5" />

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium">
                      {item.role}
                      <span className="text-muted"> · </span>
                      {item.companyUrl ? (
                        <a
                          href={item.companyUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline transition-colors hover:text-accent"
                        >
                          {item.company}
                        </a>
                      ) : (
                        <span className="text-muted">{item.company}</span>
                      )}
                    </h3>

                    {item.description ? (
                      <div className="mt-2 text-[0.9375rem]">
                        <Prose content={item.description} />
                      </div>
                    ) : null}
                  </div>

                  <span className="tnum shrink-0 pt-0.5 text-sm text-faint">
                    {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
