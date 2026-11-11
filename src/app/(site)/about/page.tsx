import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";

import { CollapsibleSection } from "@/components/collapsible-section";
import { Open } from "@/components/fluent-icons";
import { Mark } from "@/components/mark";
import { Prose } from "@/components/prose";
import { Reveal } from "@/components/reveal";
import {
  getExperiences,
  getProfile,
  getSkills,
  getTools,
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
  const [profile, updates, skillRows, toolRows, experiences] = await Promise.all([
    getProfile(),
    getUpdates(),
    getSkills(),
    getTools(),
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
  const portraitUrl = profile?.portraitUrl?.trim();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 lg:px-10 lg:py-12">
      <Reveal>
        {/* Fluent's Title 1: 32/40 semibold. */}
        <h1 className="text-[28px] font-semibold leading-9 sm:text-[32px] sm:leading-10">{title}</h1>
      </Reveal>

      {body ? (
        <Reveal index={1}>
          <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="max-w-2xl text-base leading-[22px]">
              <Prose content={body} />
            </div>

            {portraitUrl ? (
              <div className="card order-first w-44 overflow-hidden md:order-none md:w-auto">
                <div className="relative aspect-[4/5] bg-background">
                  <Image
                    src={portraitUrl}
                    alt={profile?.name ?? ""}
                    fill
                    sizes="208px"
                    priority
                    className="object-cover object-top"
                  />
                </div>
                {profile?.name ? (
                  <div className="border-t border-line p-3">
                    <p className="text-sm font-semibold">{profile.name}</p>
                    {profile.role ? <p className="text-xs text-faint">{profile.role}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Reveal>
      ) : null}

      {experiences.length > 0 ? (
        <Section id="career" title={careerHeading} intro={careerIntro}>
          <ol className="card divide-y divide-line">
            {experiences.map((item) => {
              const period = (
                <>
                  {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                </>
              );

              return (
                <li key={item.id} className="flex items-start gap-4 p-4 sm:p-5">
                  <Mark src={item.logoUrl} label={item.company} className="mt-0.5" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <h3 className="text-base font-semibold leading-[22px]">{item.role}</h3>
                      <span className="tnum text-xs text-faint">{period}</span>
                    </div>
                    <p className="text-sm">
                      {item.companyUrl ? (
                        <a href={item.companyUrl} target="_blank" rel="noreferrer noopener" className="fluent-link">
                          {item.company}
                        </a>
                      ) : (
                        <span className="text-muted">{item.company}</span>
                      )}
                    </p>

                    {item.description ? (
                      <div className="mt-3 text-sm">
                        <Prose content={item.description} />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}

      {skillGroups.length > 0 ? (
        <Section id="skills" title={techHeading} intro={techIntro}>
          <div className="card grid gap-5 p-4 sm:p-5">
            {skillGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-semibold text-faint">{group.category}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <li key={skill.id} className="tag py-0.5 pl-0.5">
                      <Mark src={skill.logoUrl} label={skill.name} size="sm" />
                      {skill.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {toolRows.length > 0 ? (
              <div className="border-t border-line pt-2">
                <CollapsibleSection title="Additional tools" count={toolRows.length}>
                  <ul className="grid gap-2.5">
                    {toolRows.map((tool) => (
                      <li key={tool.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                        {tool.url ? (
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="fluent-link inline-flex items-center gap-1"
                          >
                            {tool.name}
                            <Open className="size-3.5" />
                          </a>
                        ) : (
                          <span className="font-semibold">{tool.name}</span>
                        )}

                        {tool.description ? <span className="text-muted">{tool.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {updates.length > 0 ? (
        <section className="mt-10">
          <Reveal>
            <div className="card px-4 py-1 sm:px-5">
              {/*
                Scroll reveals are deliberately not used on the rows here:
                while the section is closed they have no height to intersect
                with, so they would sit at opacity 0.
              */}
              <CollapsibleSection title={updatesHeading} count={updates.length}>
                <ul className="divide-y divide-line">
                  {updates.map((update) => (
                    <li key={update.id} className="flex items-start gap-4 py-3">
                      <Mark src={update.logoUrl} label={update.title} className="mt-0.5" />

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">
                          {update.url ? (
                            <a
                              href={update.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="fluent-link inline-flex items-center gap-1"
                            >
                              {update.title}
                              <Open className="size-3.5" />
                            </a>
                          ) : (
                            update.title
                          )}
                        </h3>

                        {update.description ? <p className="mt-0.5 text-sm text-muted">{update.description}</p> : null}
                      </div>

                      <span className="tnum shrink-0 text-xs text-faint">{formatPeriod(update.date)}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            </div>
          </Reveal>
        </section>
      ) : null}
    </main>
  );
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <Reveal>
        {/* Fluent's Title 3: 24/32 semibold. */}
        <h2 className="text-2xl font-semibold leading-8">{title}</h2>
        {intro ? <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p> : null}
        <div className="mt-4">{children}</div>
      </Reveal>
    </section>
  );
}
