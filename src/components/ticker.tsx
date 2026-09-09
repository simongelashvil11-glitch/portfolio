/**
 * The scrolling line between the greeting and the work list.
 *
 * Words alternate filled and outlined, on no background at all. See
 * `.ticker-outline` and `.ticker-fade` for why there is no card around it.
 *
 * The movement is a CSS animation rather than a script — nothing here runs
 * per frame, and nothing measures the DOM.
 *
 * The run of words is rendered twice. The animation travels exactly half the
 * track, which lands on a frame identical to the first, so the loop has no
 * visible seam and no need to measure anything at runtime.
 */

/*
 * Roughly how wide a character is at this size and weight, including the
 * separator that follows each phrase. Everything below is estimated from it
 * rather than measured, which keeps this renderable on the server — a few
 * pixels out only shifts the scroll speed slightly.
 */
const CHAR_PX = 19;

/** Travel speed. Turning length into duration keeps long and short text even. */
const PX_PER_SECOND = 45;

/** The content column, less its padding. */
const STRIP_PX = 672;

export function Ticker({ text }: { text: string | null | undefined }) {
  const phrase = text?.trim();
  if (!phrase) return null;

  const itemPx = (phrase.length + 3) * CHAR_PX;

  /*
   * Enough copies to cover the column, plus one so no gap opens at the seam.
   * Rounded up to an even number: fill and outline alternate by index, and an
   * odd count would butt two filled words together where the halves meet.
   */
  const needed = Math.ceil(STRIP_PX / itemPx) + 1;
  const perHalf = Math.min(8, Math.max(2, needed + (needed % 2)));
  const duration = Math.min(90, Math.max(12, Math.round((perHalf * itemPx) / PX_PER_SECOND)));

  return (
    <div className="ticker-fade overflow-hidden">
      {/*
        The visible run repeats the phrase many times over, which a screen
        reader would read out every one of. It is announced once here instead,
        and the line itself is hidden from assistive tech.
      */}
      <span className="sr-only">{phrase}</span>

      <div
        className="ticker-track font-display text-[2rem] uppercase tracking-display"
        style={{ animationDuration: `${duration}s` }}
        aria-hidden
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {Array.from({ length: perHalf }, (_, index) => (
              <span key={index} className="flex shrink-0 items-center">
                <span className={index % 2 === 1 ? "ticker-outline" : undefined}>{phrase}</span>
                <span className="px-6 text-base text-faint">&bull;</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
