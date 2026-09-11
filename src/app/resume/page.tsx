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
 *
 * A description written as plain prose still shows, as a single point.
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
  const name = profile?.name ?? "";
  const contact = [profile?.role, profile?.location].filter(Boolean).join(" · ");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
/*
 * A print document, so it is measured in millimetres and points rather than
 * in the site's tokens — those are built for a dark screen, and every one of
 * them would have to be overridden here.
 *
 * The page keeps the site's face and its restraint: one neutral ink, hairline
 * rules, generous letter-spacing on the small labels. Only the ground flips.
 */
@page { size: A4; margin: 0; }

.cv {
  --ink: #14151a;
  --muted: #454a53;
  --faint: #868c95;
  --line: #e4e6ea;
  --panel: #f6f7f9;

  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 13mm 14mm;
  background: #fff;
  color: var(--ink);
  font-family: var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 9pt;
  line-height: 1.45;
  /* The panels and rules are the design, not decoration, so they must print. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cv * { box-sizing: border-box; }

.cv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; }
.cv-name { font-size: 21pt; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; margin: 0; }
.cv-role { margin: 1.5mm 0 0; font-size: 9.5pt; color: var(--muted); }
.cv-tagline { margin: 3mm 0 0; font-size: 10pt; color: var(--ink); max-width: 108mm; }

.cv-contact { text-align: right; font-size: 8.5pt; color: var(--muted); line-height: 1.7; white-space: nowrap; }
.cv-contact a { color: inherit; text-decoration: none; }
.cv-badge {
  display: inline-block; margin-bottom: 1.5mm; padding: 0.8mm 2.4mm;
  border: 0.3mm solid var(--line); border-radius: 2mm;
  background: var(--panel); font-size: 7.5pt; color: var(--muted);
}

.cv-rule { height: 0.3mm; background: var(--line); margin: 6mm 0 5mm; }

.cv-body { display: grid; grid-template-columns: 1.5fr 1fr; gap: 9mm; }

.cv-h2 {
  margin: 0 0 3mm; font-size: 7.5pt; font-weight: 600;
  letter-spacing: 0.13em; text-transform: uppercase; color: var(--faint);
}
.cv-col > section + section { margin-top: 6mm; }

.cv-role-block + .cv-role-block { margin-top: 4mm; }
.cv-role-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.cv-role-title { font-size: 9.5pt; font-weight: 600; }
.cv-role-org { font-weight: 400; color: var(--muted); }
.cv-dates { font-size: 8pt; color: var(--faint); white-space: nowrap; font-variant-numeric: tabular-nums; }

.cv-points { margin: 1.5mm 0 0; padding: 0; list-style: none; }
.cv-points li { position: relative; padding-left: 3.5mm; color: var(--muted); font-size: 8.5pt; }
.cv-points li + li { margin-top: 1mm; }
.cv-points li::before {
  content: ""; position: absolute; left: 0; top: 1.55mm;
  width: 1mm; height: 1mm; border-radius: 50%; background: #c3c7ce;
}

.cv-group + .cv-group { margin-top: 2.5mm; }
.cv-group-name { font-size: 7.5pt; font-weight: 600; color: var(--faint); letter-spacing: 0.04em; }
.cv-group-items { margin-top: 0.8mm; color: var(--muted); font-size: 8.5pt; }

.cv-work + .cv-work { margin-top: 3mm; }
.cv-work-name { font-size: 8.5pt; font-weight: 600; }
.cv-work-note { margin-top: 0.5mm; color: var(--muted); font-size: 8pt; }

.cv-aside {
  margin-top: 4mm; padding: 3mm;
  border: 0.3mm solid var(--line); border-radius: 2.5mm; background: var(--panel);
  font-size: 7.5pt; color: var(--muted);
}

/* On screen it sits on the site's dark ground; give it a page to sit on. */
@media screen {
  body { background: #22242a; }
  .cv { margin: 8mm auto; box-shadow: 0 2mm 12mm rgb(0 0 0 / 0.45); border-radius: 1.5mm; }
}
@media print {
  body { background: #fff; }
  .cv { margin: 0; box-shadow: none; border-radius: 0; }
}
`,
        }}
      />

      <main className="cv">
        <header className="cv-head">
          <div>
            <h1 className="cv-name">{name}</h1>
            {contact ? <p className="cv-role">{contact}</p> : null}
            {profile?.headline ? <p className="cv-tagline">{profile.headline}</p> : null}
          </div>

          <div className="cv-contact">
            {profile?.availability ? (
              <div>
                <span className="cv-badge">{profile.availability}</span>
              </div>
            ) : null}
            {profile?.email ? (
              <div>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </div>
            ) : null}
            {(profile?.socials ?? []).map((social) => (
              <div key={social.url}>
                <a href={social.url}>{prettyUrl(social.url)}</a>
              </div>
            ))}
          </div>
        </header>

        <div className="cv-rule" />

        <div className="cv-body">
          <div className="cv-col">
            {profile?.bio ? (
              <section>
                <h2 className="cv-h2">Profile</h2>
                {profile.bio
                  .replace(/\r\n?/g, "\n")
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p
                      key={index}
                      style={{
                        margin: index === 0 ? 0 : "2mm 0 0",
                        color: "var(--muted)",
                        fontSize: "8.5pt",
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
              </section>
            ) : null}

            {experiences.length > 0 ? (
              <section>
                <h2 className="cv-h2">Experience</h2>
                {experiences.map((item) => {
                  const points = toPoints(item.description);
                  return (
                    <div key={item.id} className="cv-role-block">
                      <div className="cv-role-head">
                        <div className="cv-role-title">
                          {item.role}
                          <span className="cv-role-org"> · {item.company}</span>
                        </div>
                        <div className="cv-dates">
                          {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                        </div>
                      </div>

                      {points.length > 0 ? (
                        <ul className="cv-points">
                          {points.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : null}
          </div>

          <div className="cv-col">
            {skillGroups.length > 0 ? (
              <section>
                <h2 className="cv-h2">Toolkit</h2>
                {skillGroups.map((group) => (
                  <div key={group.category} className="cv-group">
                    <div className="cv-group-name">{group.category}</div>
                    <div className="cv-group-items">
                      {group.items.map((skill) => skill.name).join(", ")}
                    </div>
                  </div>
                ))}

                {tools.length > 0 ? (
                  <div className="cv-aside">
                    Also uses {tools.map((tool) => tool.name).join(", ")}.
                  </div>
                ) : null}
              </section>
            ) : null}

            {projects.length > 0 ? (
              <section>
                <h2 className="cv-h2">Selected work</h2>
                {projects.map((project) => (
                  <div key={project.id} className="cv-work">
                    <div className="cv-work-name">{project.title}</div>
                    {project.summary ? (
                      <div className="cv-work-note">{project.summary}</div>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
