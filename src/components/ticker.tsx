/**
 * The scrolling strip between the greeting and the work list.
 *
 * The movement is a CSS animation rather than a script — nothing here runs
 * per frame, and nothing measures the DOM. (It still lands in the client
 * bundle, because the sidebar that renders it is a client component.)
 *
 * The run of words is rendered twice. The animation travels exactly half the
 * track, which lands on a frame identical to the first, so the loop has no
 * visible seam and no need to measure anything at runtime.
 */

/*
 * Roughly how wide a character is at this size and weight. Everything below
 * is estimated from it rather than measured, which keeps this renderable on
 * the server — a few pixels out only shifts the scroll speed slightly.
 */
const CHAR_PX = 17;

/** Travel speed. Turning length into duration keeps long and short text even. */
const PX_PER_SECOND = 45;

/** The content column, less its padding. */
const STRIP_PX = 672;

export function Ticker({ text }: { text: string | null | undefined }) {
  const phrase = text?.trim();
  if (!phrase) return null;

  const item = `${phrase} •`;
  const itemPx = item.length * CHAR_PX;

  /*
   * Enough copies to cover the strip, plus one so a gap never appears at the
   * seam — and no more. A fixed count would build a track several thousand
   * pixels wide for a long phrase that already overflows on its own.
   */
  const perHalf = Math.min(8, Math.max(2, Math.ceil(STRIP_PX / itemPx) + 1));
  const halfPx = perHalf * itemPx;
  const duration = Math.min(90, Math.max(12, Math.round(halfPx / PX_PER_SECOND)));

  return (
    <div className="overflow-hidden rounded-xl bg-(--ticker-cream) py-3">
      {/*
        The visible run repeats the phrase many times over, which a screen
        reader would read out every one of. It is announced once here instead,
        and the strip itself is hidden from assistive tech.
      */}
      <span className="sr-only">{phrase}</span>

      <div
        className="ticker-track"
        style={{ animationDuration: `${duration}s` }}
        aria-hidden
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {Array.from({ length: perHalf }, (_, index) => (
              <span
                key={index}
                className="ticker-word font-display text-[1.75rem] font-extrabold uppercase"
                data-text={item}
              >
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
