import type { Metadata } from "next";

import {
  getExperiences,
  getProfile,
  getProjects,
  getSkills,
  getTools,
  groupSkills,
} from "@/lib/queries";
import { formatPeriod } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Résumé",
  // A document to hand over, not a page to be found. The sitemap is an
  // explicit list and never included this, so this only closes the other door.
  robots: { index: false, follow: false },
};

/** Same set the site's prose formatter accepts, so pasted text behaves alike. */
const BULLET = /^[-*•]\s+/;

/**
 * Pulls the points out of a description.
 *
 * Only a line opening with a marker starts a new point; anything else joins
 * the one before it. Entries wrap mid-sentence in the database, and splitting
 * on every newline broke those in half — the site's prose formatter treats a
 * lone newline as a break inside the same item for the same reason.
 */
function toPoints(description: string | null): string[] {
  if (!description) return [];

  const points: string[] = [];

  for (const raw of description.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (BULLET.test(line) || points.length === 0) {
      points.push(line.replace(BULLET, ""));
    } else {
      points[points.length - 1] += ` ${line}`;
    }
  }

  return points;
}

/** `https://www.linkedin.com/in/x/` reads as noise on paper; this does not. */
function prettyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

export default async function ResumePage() {
  const [profile, experiences, skillRows, tools, projects] = await Promise.all([
    getProfile(),
    getExperiences(),
    getSkills(),
    getTools(),
    getProjects(),
  ]);

  const skillGroups = groupSkills(skillRows);

  const contactLine = [
    profile?.email,
    ...(profile?.socials ?? []).map((social) => prettyUrl(social.url)),
  ].filter(Boolean);

  const bioParagraphs = (profile?.bio ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/*
 * Built to be read by a machine first and a person second.
 *
 * Every choice here that looks plain is deliberate:
 *
 * - One column. Applicant tracking systems commonly read straight across a
 *   page, so a two-column layout interleaves the columns into nonsense. This
 *   is the single biggest thing that breaks a parsed résumé.
 * - A locally installed face, not the site's web font. Chrome cannot embed a
 *   web font into a PDF as a font program and falls back to Type 3 glyph
 *   outlines, which carry no reliable text layer. A system face is embedded
 *   properly and the words survive extraction.
 * - Ordinary section headings — Summary, Experience, Skills, Projects — since
 *   parsers look for those words to decide what each block is.
 * - No panels, boxes or pills. Anything that reads as a table or a text frame
 *   is a place where extraction can reorder or drop content.
 *
 * What is left of the site's look is what costs nothing to keep: the light
 * ground, hairline rules, letter-spaced labels and one neutral ink.
 */
@page { size: A4; margin: 0; }

.cv {
  --ink: #14151a;
  --muted: #3f444c;
  --faint: #7c828b;
  --line: #d9dce1;

  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 11mm 13mm;
  background: #fff;
  color: var(--ink);
  font-family: "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 9.1pt;
  line-height: 1.36;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cv * { box-sizing: border-box; }
.cv p { margin: 0; }

.cv-name {
  margin: 0;
  font-size: 19pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.cv-title { margin-top: 1mm; font-size: 10.2pt; color: var(--muted); }
.cv-contact { margin-top: 1.4mm; font-size: 8.9pt; color: var(--muted); }
.cv-contact a { color: inherit; text-decoration: none; }

.cv-h2 {
  margin: 4.8mm 0 2.1mm;
  padding-bottom: 1mm;
  border-bottom: 0.3mm solid var(--line);
  font-size: 8.2pt;
  font-weight: 700;
  /*
   * No letter-spacing. Chrome splits a tracked word into separate text runs
   * and an extractor rejoins them with a space — "EXPERIENCE" came out as
   * "E XPERIENCE", and a section heading is exactly the string a parser looks
   * for to work out what the block beneath it is.
   */
  text-transform: uppercase;
  color: var(--faint);
}

.cv-entry + .cv-entry { margin-top: 2.6mm; }
.cv-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6mm;
}
.cv-entry-title { font-size: 9.7pt; font-weight: 600; }
.cv-entry-org { font-weight: 400; color: var(--muted); }
.cv-entry-dates {
  font-size: 8.9pt;
  color: var(--muted);
  white-space: nowrap;
}

/*
 * The bullet is written into the text, not left to the CSS list marker, which
 * never reached the text layer at all: extraction came back with no bullet
 * characters anywhere — and a bullet is one of the cues a parser uses to tell
 * a list of achievements from a paragraph. The hanging indent keeps wrapped
 * lines aligned under the first word rather than under the marker.
 */
.cv-points { margin: 1.2mm 0 0; padding: 0 0 0 4.2mm; list-style: none; }
.cv-points li {
  margin-top: 0.6mm;
  color: var(--muted);
  text-indent: -4.2mm;
}

.cv-line { margin-top: 1.2mm; color: var(--muted); }
.cv-line:first-of-type { margin-top: 0; }
.cv-label { font-weight: 600; color: var(--ink); }

.cv-summary p + p { margin-top: 1.6mm; }
.cv-summary { color: var(--muted); }

@media screen {
  body { background: #22242a; }
  .cv { margin: 8mm auto; box-shadow: 0 2mm 12mm rgb(0 0 0 / 0.45); }
}
@media print {
  body { background: #fff; }
  .cv { margin: 0; box-shadow: none; }
}
`,
        }}
      />

      <main className="cv">
        <h1 className="cv-name">{profile?.name}</h1>

        {profile?.role || profile?.location ? (
          <p className="cv-title">
            {[profile?.role, profile?.location].filter(Boolean).join(" — ")}
          </p>
        ) : null}

        {contactLine.length > 0 ? (
          <p className="cv-contact">{contactLine.join("  |  ")}</p>
        ) : null}

        {bioParagraphs.length > 0 ? (
          <>
            <h2 className="cv-h2">Summary</h2>
            <div className="cv-summary">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </>
        ) : null}

        {experiences.length > 0 ? (
          <>
            <h2 className="cv-h2">Experience</h2>
            {experiences.map((item) => {
              const points = toPoints(item.description);
              return (
                <div key={item.id} className="cv-entry">
                  <div className="cv-entry-head">
                    <div className="cv-entry-title">
                      {item.role}
                      <span className="cv-entry-org">, {item.company}</span>
                    </div>
                    <div className="cv-entry-dates">
                      {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                    </div>
                  </div>

                  {points.length > 0 ? (
                    <ul className="cv-points">
                      {points.map((point, index) => (
                        <li key={index}>{"•  "}{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </>
        ) : null}

        {skillGroups.length > 0 ? (
          <>
            <h2 className="cv-h2">Skills</h2>
            {skillGroups.map((group) => (
              <p key={group.category} className="cv-line">
                <span className="cv-label">{group.category}: </span>
                {group.items.map((skill) => skill.name).join(", ")}
              </p>
            ))}
            {tools.length > 0 ? (
              <p className="cv-line">
                <span className="cv-label">Also uses: </span>
                {tools.map((tool) => tool.name).join(", ")}
              </p>
            ) : null}
          </>
        ) : null}

        {projects.length > 0 ? (
          <>
            <h2 className="cv-h2">Projects</h2>
            {projects.map((project) => (
              <p key={project.id} className="cv-line">
                <span className="cv-label">{project.title}. </span>
                {project.summary}
              </p>
            ))}
          </>
        ) : null}
      </main>
    </>
  );
}
