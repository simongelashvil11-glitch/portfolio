import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { CollapsibleSection } from "@/components/collapsible-section";
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
  const portraitUrl = profile?.portraitUrl?.trim();
  const name = profile?.name?.trim();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-12">
      <Reveal>
        <h1 className="font-display text-4xl tracking-display sm:text-5xl">{title}</h1>
      </Reveal>

      {body ? (
        <Reveal index={1}>
          {/*
            Column-reverse on small screens puts the portrait above the intro
            rather than orphaning it at the end of the copy. It is deliberately
            narrow — the intro is the point of the page, the photo is a face to
            put to it.
          */}
          <div className="mt-10 flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:gap-12">
            {/*
              A step down from body size. The intro sits beside a small photo,
              and at full size the two masses competed — the lighter text lets
              the picture hold its own without being enlarged.
            */}
            <div className="min-w-0 flex-1 text-[0.9375rem]">
              <Prose content={body} />
            </div>

            {portraitUrl ? (
              /*
                The panel stretches to the height of the copy, so the two
                columns read as blocks of equal weight rather than a picture
                hanging off the first line, with the figure centred in it.
                The source is cropped mid-leg, so the photo fades out over
                that cut. See `portrait-fade` for why it is nudged down.
                The photo is a transparent cutout, so the panel can carry a
                fill without a picture-shaped rectangle showing on top of it.
                The fill is what makes the silhouette read at all: the t-shirt
                bottoms out near black, which is invisible against the page but
                clearly separated from the panel.
                Below `sm` the layout stacks, where a full-height panel has
                nothing to match, so it shrinks to fit the photo instead.
              */
              <div className="flex w-40 shrink-0 flex-col self-start overflow-hidden rounded-2xl border border-line bg-surface sm:w-44 sm:self-stretch lg:w-48">
                {/*
                  Chrome borrowed from `MacWindow` — the same hairline, tint
                  and lights — so the card reads as part of that family. It is
                  decoration and nothing else, so it is hidden from assistive
                  tech rather than announced as three unlabelled somethings.
                */}
                <div
                  className="flex h-8 shrink-0 items-center gap-1.5 border-b border-white/8 bg-white/4 px-3"
                  aria-hidden
                >
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>

                <div className="flex flex-1 items-center justify-center p-4">
                  <Image
                    src={portraitUrl}
                    alt={profile?.name ?? ""}
                    width={637}
                    height={955}
                    sizes="192px"
                    priority
                    className="portrait-fade h-auto w-full translate-y-[6%]"
                  />
                </div>

                {name ? (
                  <p className="border-t border-white/8 bg-white/4 px-3 py-2.5 text-center font-display text-[0.8125rem] tracking-display">
                    {name}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Reveal>
      ) : null}

      {updates.length > 0 ? (
        <section className="mt-20">
          <Reveal>
            {/*
              Scroll reveals are deliberately not used on the rows here: while
              the section is closed they have no height to intersect with, so
              they would sit at opacity 0. The disclosure animation carries
              them in instead.
            */}
            <CollapsibleSection title={updatesHeading} count={updates.length}>
              <ul>
                {updates.map((update) => (
                  <li
                    key={update.id}
                    className="group flex items-start gap-4 border-b border-line py-5 last:border-0"
                  >
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
                ))}
              </ul>
            </CollapsibleSection>
          </Reveal>
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
            {experiences.map((item, index) => {
              const period = (
                <>
                  {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                </>
              );

              return (
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

                    {/*
                      Narrow screens put the dates on their own line. Held in
                      a column beside the text they cost about a third of the
                      row, which squeezed the description to a few words a
                      line and made long role titles wrap around them.
                    */}
                    <span className="tnum mt-1 block text-sm text-faint sm:hidden">
                      {period}
                    </span>

                    {item.description ? (
                      <div className="mt-2 text-[0.9375rem]">
                        <Prose content={item.description} />
                      </div>
                    ) : null}
                  </div>

                  <span className="tnum hidden shrink-0 pt-0.5 text-sm text-faint sm:block">
                    {period}
                  </span>
                </li>
              </Reveal>
              );
            })}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
