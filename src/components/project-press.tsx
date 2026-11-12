import Image from "next/image";

import { Open } from "@/components/fluent-icons";
import { Window } from "@/components/window";
import type { ProjectPress as Article } from "@/db/schema";

/**
 * Articles about a project, as a window: the photo beside the publication,
 * the headline (and the original, when it was translated), a line or two of
 * summary and a link out. Placed high on the case study so anyone checking
 * the work sees the independent coverage before the detail.
 */
export function ProjectPress({ press }: { press: Article[] }) {
  if (press.length === 0) return null;

  return (
    <Window
      id="press-title"
      title="In the press"
      icon={<NewsMark />}
      aside={press.length > 1 ? `${press.length} articles` : null}
    >
      <ul className="grid gap-6">
        {press.map((article, i) => (
          <li key={i} className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
            {article.image ? (
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={-1}
                aria-hidden
                className="group relative block aspect-[4/3] overflow-hidden rounded-[6px] bg-surface"
              >
                <Image
                  src={article.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 240px"
                  className="object-cover transition-transform duration-300 ease-(--ease-fluent) group-hover:scale-[1.03]"
                />
              </a>
            ) : null}

            <div className={`flex min-w-0 flex-col ${article.image ? "" : "sm:col-span-2"}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-faint">
                <span className="size-1.5 shrink-0 rounded-full bg-lavender" aria-hidden />
                {article.outlet}
                {article.date ? <span className="font-normal">· {article.date}</span> : null}
              </p>

              <h3 className="mt-1.5 text-lg font-semibold leading-6 text-balance">{article.title}</h3>
              {article.originalTitle && article.originalTitle !== article.title ? (
                <p className="mt-1 text-sm text-faint">{article.originalTitle}</p>
              ) : null}

              {article.summary ? <p className="mt-3 text-sm leading-5 text-muted">{article.summary}</p> : null}

              <div className="mt-4 sm:mt-auto sm:pt-4">
                <a href={article.url} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
                  <Open />
                  Read the article
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Window>
  );
}

/** A newspaper, drawn to sit with the other title-bar marks. */
function NewsMark() {
  return (
    <svg viewBox="0 0 20 20" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 3.5h9a1 1 0 0 1 1 1v10.5a1.5 1.5 0 0 0 1.5 1.5H5a2 2 0 0 1-2-2V5a1.5 1.5 0 0 1 1.5-1.5" />
      <path d="M14.5 7.5h2a1 1 0 0 1 1 1V15a1.5 1.5 0 0 1-3 0" />
      <rect x="6" y="6.5" width="5.5" height="3.5" rx=".5" />
      <path d="M6 12.5h5.5M6 14.5h3.5" />
    </svg>
  );
}
