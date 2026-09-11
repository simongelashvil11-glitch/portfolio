import {
  getExperiences,
  getProfile,
  getProjects,
  getSkills,
  getTools,
  groupSkills,
} from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";
import { formatPeriod } from "@/lib/utils";

/**
 * The designed résumé, in either appearance.
 *
 * One component rather than a page each: the two differ only in palette, and
 * kept apart they would drift the first time either was edited. The tone picks
 * a variable block; nothing in the markup below knows a colour.
 */
export type Tone = "dark" | "light";

/** Same set the site's prose formatter accepts, so pasted text behaves alike. */
const BULLET = /^[-*•]\s+/;

/** Only a line opening with a marker starts a point; the rest join the one above. */
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

function prettyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

const STYLES = `
/*
 * The designed résumé. Its plain twin at /resume is built to survive a parser
 * and looks it; this carries the site's palette, face and window chrome onto
 * paper.
 *
 * Every colour here is a background that has to survive printing, so the sheet
 * asks for exact colour rather than letting a printer drop it.
 */
@page { size: A4; margin: 0; }

.vr {
  --bg: #121212;
  --surface: #1b1b1b;
  --raised: #202020;
  --line: #2a2a2a;
  --ink: #ffffff;
  --muted: #b3b3b3;
  --faint: #7c7c7c;
  --bullet: #4a4a4a;
  --chrome: rgba(255, 255, 255, 0.04);
  --chrome-line: rgba(255, 255, 255, 0.08);

  /*
   * The aurora, the one thing every page of the site has in common, laid
   * across the head of the sheet rather than the whole of it: enough to read
   * as the same surface, little enough that a printer does not have to lay
   * down a full page of ink to say so.
   */
  --wash-1: rgba(120, 210, 180, 0.22);
  --wash-2: rgba(150, 140, 255, 0.2);
  --wash-3: rgba(90, 180, 220, 0.15);

  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 11mm 12mm;
  background:
    radial-gradient(58% 32% at 14% 0%, var(--wash-1), transparent 72%),
    radial-gradient(54% 30% at 78% 1%, var(--wash-2), transparent 74%),
    radial-gradient(46% 24% at 46% 0%, var(--wash-3), transparent 70%),
    var(--bg);
  color: var(--ink);
  font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  font-size: 8.4pt;
  line-height: 1.42;
  letter-spacing: -0.006em;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/*
 * Milk rather than white, and the washes are the same pale hues the site's
 * light sidebar drifts through — warm sand, cool blue, lilac and mint — so
 * this reads as the light side of the same site rather than a second design.
 */
.vr.is-light {
  --bg: #faf7f1;
  --surface: #f3efe7;
  --raised: #ebe6db;
  --line: #e2ddd1;
  --ink: #16171b;
  --muted: #4c5058;
  --faint: #8b8f96;
  --bullet: #b8b4a9;
  --chrome: rgba(0, 0, 0, 0.035);
  --chrome-line: rgba(0, 0, 0, 0.08);

  --wash-1: rgba(203, 233, 215, 0.9);
  --wash-2: rgba(220, 213, 246, 0.85);
  --wash-3: rgba(205, 226, 248, 0.75);
}

/*
 * On milk the photo sits on its own dark ground rather than on the card.
 *
 * The portrait is a cutout, and its matte was built by thresholding a studio
 * backdrop: good enough to be invisible against the dark site, but stepped
 * around the hair, which milk shows up mercilessly. Putting the ground back
 * under it makes it a photograph in a frame instead of a shape cut out badly,
 * and the fade at the mid-leg crop has something to fade into again.
 */
.vr.is-light .vr-photo-wrap {
  background: #17181c;
  padding: 3mm 2.5mm 0;
}

.vr * { box-sizing: border-box; }
.vr p { margin: 0; }
.vr a { color: inherit; text-decoration: none; }

/* ---------- header ---------- */

.vr-head { display: flex; gap: 7mm; align-items: stretch; }

/*
 * The portrait keeps the card it has on the about page: window chrome above,
 * a name bar below, the photo fading out over the mid-leg crop of the source.
 */
.vr-card {
  width: 38mm;
  flex: none;
  display: flex;
  flex-direction: column;
  border: 0.3mm solid var(--line);
  border-radius: 3mm;
  background: var(--surface);
  overflow: hidden;
}
.vr-chrome {
  display: flex;
  align-items: center;
  gap: 1.4mm;
  height: 6mm;
  padding: 0 2.2mm;
  border-bottom: 0.3mm solid var(--chrome-line);
  background: var(--chrome);
}
.vr-light { width: 1.9mm; height: 1.9mm; border-radius: 50%; }
.vr-photo-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2.5mm; }
.vr-photo {
  width: 100%;
  height: auto;
  transform: translateY(6%);
  -webkit-mask-image: linear-gradient(to bottom, #000 66%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 66%, transparent 100%);
}
.vr-cardname {
  border-top: 0.3mm solid var(--chrome-line);
  background: var(--chrome);
  padding: 1.6mm 2mm;
  text-align: center;
  font-size: 7.4pt;
  font-weight: 500;
}

.vr-intro { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.vr-name { margin: 0; font-size: 25pt; font-weight: 600; line-height: 1.02; letter-spacing: -0.025em; }
.vr-role { margin-top: 1.6mm; font-size: 9pt; color: var(--faint); letter-spacing: 0.02em; }
.vr-tagline { margin-top: 3mm; font-size: 11pt; line-height: 1.3; letter-spacing: -0.015em; }
.vr-bio { margin-top: 2.4mm; color: var(--muted); font-size: 8.2pt; }

.vr-contacts { margin-top: 3.4mm; display: flex; flex-wrap: wrap; gap: 1.6mm; }
.vr-chip {
  border: 0.3mm solid var(--line);
  border-radius: 10mm;
  background: var(--surface);
  padding: 1mm 2.6mm;
  font-size: 7.4pt;
  color: var(--muted);
}

/* ---------- body ---------- */

.vr-rule { height: 0.3mm; background: var(--line); margin: 6mm 0 5mm; }
.vr-body { display: grid; grid-template-columns: 1.42fr 1fr; gap: 8mm; }

.vr-h2 {
  margin: 0 0 3mm;
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
}
.vr-col > section + section { margin-top: 6mm; }

.vr-job + .vr-job { margin-top: 3.4mm; }
.vr-job-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.vr-job-title { font-size: 9pt; font-weight: 600; letter-spacing: -0.01em; }
.vr-job-org { font-weight: 400; color: var(--muted); }
.vr-job-dates { font-size: 7.4pt; color: var(--faint); white-space: nowrap; }

.vr-points { margin: 1.4mm 0 0; padding: 0; list-style: none; }
.vr-points li { position: relative; padding-left: 3.2mm; color: var(--muted); }
.vr-points li + li { margin-top: 0.9mm; }
.vr-points li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 1.45mm;
  width: 0.9mm;
  height: 0.9mm;
  border-radius: 50%;
  background: var(--bullet);
}

/* ---------- toolkit ---------- */

.vr-group + .vr-group { margin-top: 3mm; }
.vr-group-name { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
.vr-tags { margin-top: 1.4mm; display: flex; flex-wrap: wrap; gap: 1.4mm; }
.vr-tag {
  display: flex;
  align-items: center;
  gap: 1.4mm;
  border: 0.3mm solid var(--line);
  border-radius: 2mm;
  background: var(--surface);
  padding: 0.9mm 2mm 0.9mm 1mm;
  font-size: 7.4pt;
}
.vr-mark {
  width: 3.4mm;
  height: 3.4mm;
  border-radius: 1mm;
  object-fit: cover;
  background: var(--raised);
  flex: none;
}
.vr-mark-fallback { display: flex; align-items: center; justify-content: center; font-size: 5.6pt; color: var(--faint); }
.vr-also { margin-top: 3mm; color: var(--faint); font-size: 7.2pt; line-height: 1.4; }

/* ---------- work ---------- */

.vr-work + .vr-work { margin-top: 2.6mm; }
.vr-work-name { font-size: 8.2pt; font-weight: 600; }
.vr-work-note { margin-top: 0.5mm; color: var(--muted); font-size: 7.6pt; }

.vr-foot {
  margin-top: 6mm;
  padding-top: 3mm;
  border-top: 0.3mm solid var(--line);
  display: flex;
  justify-content: space-between;
  font-size: 7pt;
  color: var(--faint);
}

@media screen {
  .vr { margin: 8mm auto; box-shadow: 0 3mm 18mm rgb(0 0 0 / 0.7); }
  .vr.is-light { box-shadow: 0 3mm 18mm rgb(0 0 0 / 0.35); }
}
@media print {
  .vr { margin: 0; box-shadow: none; }
}
`;

export async function VisualResume({ tone }: { tone: Tone }) {
  const [profile, experiences, skillRows, tools, projects] = await Promise.all([
    getProfile(),
    getExperiences(),
    getSkills(),
    getTools(),
    getProjects(),
  ]);

  const skillGroups = groupSkills(skillRows);
  const portraitUrl = profile?.portraitUrl?.trim();

  const contacts: { href: string; text: string }[] = [
    { href: siteUrl, text: prettyUrl(siteUrl) },
    ...(profile?.email ? [{ href: `mailto:${profile.email}`, text: profile.email }] : []),
    ...(profile?.socials ?? [])
      .filter((social) => !/instagram/i.test(social.label) && !/instagram/i.test(social.url))
      .map((social) => ({ href: social.url, text: prettyUrl(social.url) })),
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {/* The sheet floats on a ground a shade away from its own, either way. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            tone === "light"
              ? "@media screen { body { background: #e6e1d6; } }"
              : "@media screen { body { background: #08090b; } }",
        }}
      />

      <main className={tone === "light" ? "vr is-light" : "vr"}>
        <header className="vr-head">
          {portraitUrl ? (
            <div className="vr-card">
              <div className="vr-chrome" aria-hidden>
                <span className="vr-light" style={{ background: "#ff5f57" }} />
                <span className="vr-light" style={{ background: "#febc2e" }} />
                <span className="vr-light" style={{ background: "#28c840" }} />
              </div>

              <div className="vr-photo-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="vr-photo" src={portraitUrl} alt={profile?.name ?? ""} />
              </div>

              {profile?.name ? <div className="vr-cardname">{profile.name}</div> : null}
            </div>
          ) : null}

          <div className="vr-intro">
            <h1 className="vr-name">{profile?.name}</h1>
            {profile?.role ? <p className="vr-role">{profile.role}</p> : null}
            {profile?.headline ? <p className="vr-tagline">{profile.headline}</p> : null}
            {profile?.bio ? (
              <p className="vr-bio">
                {profile.bio.replace(/\r\n?/g, "\n").split(/\n{2,}/)[0].trim()}
              </p>
            ) : null}

            {contacts.length > 0 ? (
              <div className="vr-contacts">
                {contacts.map((item) => (
                  <a key={item.href} className="vr-chip" href={item.href}>
                    {item.text}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className="vr-rule" />

        <div className="vr-body">
          <div className="vr-col">
            <section>
              <h2 className="vr-h2">Experience</h2>
              {experiences.map((item) => {
                const points = toPoints(item.description);
                return (
                  <div key={item.id} className="vr-job">
                    <div className="vr-job-head">
                      <div className="vr-job-title">
                        {item.role}
                        <span className="vr-job-org"> · {item.company}</span>
                      </div>
                      <div className="vr-job-dates">
                        {formatPeriod(item.startDate)} &ndash; {formatPeriod(item.endDate)}
                      </div>
                    </div>

                    {points.length > 0 ? (
                      <ul className="vr-points">
                        {points.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          </div>

          <div className="vr-col">
            {skillGroups.length > 0 ? (
              <section>
                <h2 className="vr-h2">Toolkit</h2>
                {skillGroups.map((group) => (
                  <div key={group.category} className="vr-group">
                    <div className="vr-group-name">{group.category}</div>
                    <div className="vr-tags">
                      {group.items.map((skill) => (
                        <span key={skill.id} className="vr-tag">
                          {skill.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="vr-mark" src={skill.logoUrl} alt="" />
                          ) : (
                            <span className="vr-mark vr-mark-fallback">{skill.name.charAt(0)}</span>
                          )}
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {tools.length > 0 ? (
                  <p className="vr-also">Also uses {tools.map((tool) => tool.name).join(", ")}.</p>
                ) : null}
              </section>
            ) : null}

            {projects.length > 0 ? (
              <section>
                <h2 className="vr-h2">Selected work</h2>
                {projects.map((project) => (
                  <div key={project.id} className="vr-work">
                    <div className="vr-work-name">{project.title}</div>
                    {project.summary ? <div className="vr-work-note">{project.summary}</div> : null}
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        </div>

        <div className="vr-foot">
          <span>{profile?.name}</span>
          <span>{prettyUrl(siteUrl)}</span>
        </div>
      </main>
    </>
  );
}
