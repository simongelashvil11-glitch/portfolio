import { getProfile, getSkills } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

/**
 * The LinkedIn banner, in either appearance.
 *
 * One component rather than a page each, for the same reason as the visual
 * résumé: the two differ only in palette, and kept apart they would drift the
 * first time either was edited. The tone picks a variable block.
 *
 * LinkedIn's banner is 1584 x 396, and the whole design follows from one fact
 * about it: the profile photo overlaps its lower left, further in on a phone
 * than on a desktop. So the left of the canvas is left to the aurora, which
 * reads well behind a photo, and everything that has to be legible sits right
 * of centre. The phone's larger circle ends around x=487; the content starts
 * at 560.
 *
 * Text is sized for the phone, not the desktop. A 4:1 banner on a 390px screen
 * is under a hundred pixels tall.
 */
export type Tone = "dark" | "light";

const W = 1584;
const H = 396;

/*
 * The banner's own positioning line. Deliberately not the homepage ticker,
 * which it started out borrowing: the two now say different things, and the
 * ticker belongs to the site.
 */
const EYEBROW = "Digital Marketer · Performance Marketing · Creative Marketing · Content Production";

function prettyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

const STYLES = `
html, body { margin: 0; padding: 0; background: #08090b; }

.lc {
  --ink: #ffffff;
  --eyebrow: rgba(255, 255, 255, 0.55);
  --glass: rgba(255, 255, 255, 0.07);
  --glass-line: rgba(255, 255, 255, 0.14);
  --tray: rgba(255, 255, 255, 0.08);
  --lift: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
  --tile-line: transparent;

  position: relative;
  width: ${W}px;
  height: ${H}px;
  overflow: hidden;
  /*
   * The site's aurora, which is what the sidebar is made of: green through
   * teal to violet on near-black, with the drift frozen at a single frame.
   */
  background:
    radial-gradient(46% 90% at 6% 58%, rgba(120, 210, 180, 0.30), transparent 70%),
    radial-gradient(34% 80% at 22% 8%, rgba(90, 180, 220, 0.22), transparent 72%),
    radial-gradient(40% 95% at 96% 30%, rgba(150, 140, 255, 0.22), transparent 70%),
    radial-gradient(30% 70% at 70% 110%, rgba(200, 130, 230, 0.14), transparent 72%),
    linear-gradient(165deg, #0f2119 0%, #102030 34%, #16162a 62%, #1b1733 100%);
  font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}

/*
 * The light side of the same site: milk, and the pale hues the light sidebar
 * drifts through — mint, blue, lilac and sand — in the same places the dark
 * version puts its green, teal and violet.
 */
.lc.is-light {
  --ink: #16171b;
  --eyebrow: rgba(22, 23, 27, 0.5);
  --glass: rgba(255, 255, 255, 0.72);
  --glass-line: rgba(0, 0, 0, 0.09);
  --tray: rgba(255, 255, 255, 0.6);
  --lift: 0 10px 28px -14px rgba(60, 50, 90, 0.35);
  /* White tiles on a pale ground need an edge, or they dissolve into it. */
  --tile-line: rgba(0, 0, 0, 0.08);

  background:
    radial-gradient(46% 90% at 6% 58%, rgba(196, 232, 212, 0.95), transparent 70%),
    radial-gradient(34% 80% at 22% 8%, rgba(200, 222, 247, 0.85), transparent 72%),
    radial-gradient(40% 95% at 96% 30%, rgba(222, 212, 248, 0.9), transparent 70%),
    radial-gradient(30% 70% at 70% 110%, rgba(247, 232, 210, 0.9), transparent 72%),
    #faf7f1;
}

/* Fine grain, so the gradient does not band once LinkedIn recompresses it. */
.lc::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-radial-gradient(circle at 17% 23%, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
  pointer-events: none;
}
.lc.is-light::after {
  background-image: repeating-radial-gradient(circle at 17% 23%, rgba(0,0,0,0.014) 0 1px, transparent 1px 3px);
  mix-blend-mode: multiply;
}

.lc-body {
  position: absolute;
  left: 560px;
  right: 60px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.lc-eyebrow {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--eyebrow);
  white-space: nowrap;
}

.lc-headline {
  margin: 16px 0 0;
  font-size: 54px;
  line-height: 1.06;
  font-weight: 600;
  letter-spacing: -0.028em;
  max-width: 880px;
}

.lc-row {
  margin-top: 30px;
  display: flex;
  align-items: center;
  gap: 22px;
}

/*
 * The toolkit as a Dock. Names would crowd a banner; marks are recognisable at
 * a glance, which is all a banner gets. They sit on light tiles, as app icons
 * do, because several of them are dark marks that all but vanished on a dark
 * tile.
 */
.lc-marks {
  display: flex;
  gap: 8px;
  padding: 7px;
  border-radius: 16px;
  background: var(--tray);
  border: 1px solid var(--glass-line);
  box-shadow: var(--lift);
}
.lc-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(180deg, #ffffff 0%, #eceef2 100%);
  border: 1px solid var(--tile-line);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.lc-mark img { width: 22px; height: 22px; object-fit: contain; border-radius: 4px; }

/*
 * The address as a window, in the chrome the site uses for everything that
 * opens: the lights, then the address in the bar. It reads as somewhere you
 * can go, which is the one thing a banner should ask of anyone.
 */
.lc-window {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  padding: 0 22px 0 18px;
  border-radius: 12px;
  background: var(--glass);
  border: 1px solid var(--glass-line);
  box-shadow: var(--lift);
}
.lc-lights { display: flex; gap: 7px; }
.lc-lights span { width: 11px; height: 11px; border-radius: 50%; display: block; }
.lc-url { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
`;

export async function LinkedInCover({ tone }: { tone: Tone }) {
  const [profile, skills] = await Promise.all([getProfile(), getSkills()]);
  const marks = skills.filter((skill) => skill.logoUrl);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <main className={tone === "light" ? "lc is-light" : "lc"}>
        <div className="lc-body">
          <div className="lc-eyebrow">{EYEBROW}</div>

          {profile?.headline ? <h1 className="lc-headline">{profile.headline}</h1> : null}

          <div className="lc-row">
            <div className="lc-window">
              <div className="lc-lights" aria-hidden>
                <span style={{ background: "#ff5f57" }} />
                <span style={{ background: "#febc2e" }} />
                <span style={{ background: "#28c840" }} />
              </div>
              <span className="lc-url">{prettyUrl(siteUrl)}</span>
            </div>

            {marks.length > 0 ? (
              <div className="lc-marks">
                {marks.map((skill) => (
                  <div key={skill.id} className="lc-mark" title={skill.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={skill.logoUrl ?? ""} alt={skill.name} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
