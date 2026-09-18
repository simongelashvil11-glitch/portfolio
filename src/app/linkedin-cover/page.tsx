import type { Metadata } from "next";

import { getProfile, getSkills } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "LinkedIn cover",
  robots: { index: false, follow: false },
};

/*
 * LinkedIn's banner is 1584 x 396, and the whole design follows from one
 * fact about it: the profile photo overlaps its lower left. On desktop the
 * circle covers roughly the left fifth; on a phone it sits further in and
 * covers more. So the left of this canvas is left to the aurora, which reads
 * well behind a photo, and everything that has to be legible sits right of
 * centre.
 *
 * Text is sized for the phone, not the desktop. A 4:1 banner on a 390px
 * screen is under a hundred pixels tall, so anything smaller than a headline
 * stops being readable there.
 */
const W = 1584;
const H = 396;

function prettyUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

const STYLES = `
html, body { margin: 0; padding: 0; background: #08090b; }

.lc {
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
  color: #fff;
  -webkit-font-smoothing: antialiased;
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

.lc-body {
  position: absolute;
  left: 560px;
  right: 84px;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.lc-eyebrow {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
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
 * do, because several of them are dark marks — Manus and the Meta pixel all
 * but disappeared on a dark tile — and the frosted tray is the same glass the
 * site's windows are made of.
 */
.lc-marks {
  display: flex;
  gap: 8px;
  padding: 7px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
}
.lc-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(180deg, #ffffff 0%, #eceef2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}
.lc-mark img { width: 22px; height: 22px; object-fit: contain; border-radius: 4px; }

/*
 * The address as a window, in the chrome the site uses for everything that
 * opens: the lights, then the address in the bar. It reads as "this lives
 * somewhere you can go", which is the one thing a banner should ask of anyone.
 */
.lc-window {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 48px;
  padding: 0 22px 0 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.6);
}
.lc-lights { display: flex; gap: 7px; }
.lc-lights span { width: 11px; height: 11px; border-radius: 50%; display: block; }
.lc-url { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
`;

export default async function LinkedInCoverPage() {
  const [profile, skills] = await Promise.all([getProfile(), getSkills()]);

  const marks = skills.filter((skill) => skill.logoUrl);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <main className="lc">
        <div className="lc-body">
          {profile?.ticker ? <div className="lc-eyebrow">{profile.ticker}</div> : null}

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
