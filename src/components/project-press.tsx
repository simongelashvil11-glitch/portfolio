import Image from "next/image";

import { Open } from "@/components/fluent-icons";
import { NewsMark, Window } from "@/components/window";
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
