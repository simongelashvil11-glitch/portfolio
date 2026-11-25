import Image from "next/image";
import Link from "next/link";

import { WhatsAppIcon, whatsAppHref } from "@/components/brand-icons";
import { ContactButton } from "@/components/contact-window";
import { ChevronRight, Mail } from "@/components/fluent-icons";
import { ProjectPicture } from "@/components/page-transition";
import type { Project } from "@/db/schema";
import { projectStill } from "@/lib/seo";

/**
 * The end of a case study: a way to start a conversation while the work is
 * fresh, and the next project, so a reader who liked this one has somewhere
 * to go rather than a footer. The next project's still is named like the
 * homepage cards, so it grows into the top of that project's page.
 */
export function ProjectEnding({
  next,
  availability,
  whatsapp,
}: {
  next: Project | null;
  availability: string | null;
  whatsapp: string | null;
}) {
  const still = next ? projectStill(next) : undefined;

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="card flex flex-col justify-between gap-5 p-6" aria-labelledby="project-cta-title">
        <div>
          {/* Fluent's Subtitle 1: 20/28 semibold. */}
          <h2 id="project-cta-title" className="text-xl font-semibold leading-7">
            Want results like this?
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {availability ? `${availability}. ` : ""}Tell me what you are working on.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ContactButton className="btn btn-primary">
            <Mail />
            Get in touch
          </ContactButton>
          {whatsapp ? (
            <a href={whatsAppHref(whatsapp)} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
              <WhatsAppIcon className="text-[#25d366]" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      {next ? (
        <Link
          href={`/projects/${next.slug}`}
          transitionTypes={["to-project"]}
          className="card card-interactive group flex items-center gap-4 overflow-hidden p-3 pr-4"
        >
          {still ? (
            <ProjectPicture slug={next.slug}>
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-[4px] bg-surface sm:w-40">
                <Image src={still} alt="" fill sizes="160px" className="object-cover" />
              </div>
            </ProjectPicture>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-faint">Next project</span>
            <span className="mt-0.5 block truncate text-base font-semibold leading-[22px]">{next.title}</span>
            {next.tags.length ? (
              <span className="mt-1 block truncate text-xs text-muted">{next.tags.slice(0, 3).join(" · ")}</span>
            ) : null}
          </span>
          <ChevronRight className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
