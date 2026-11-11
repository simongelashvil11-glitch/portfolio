/**
 * Pulls the video id out of the shapes a YouTube link normally arrives in:
 * watch?v=, youtu.be/, /embed/, /shorts/ and /live/.
 *
 * Kept out of the client video components so server pages can ask whether a
 * project's link is playable before choosing what to render.
 */
export function youTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    if (!host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) return null;

    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const [, segment, id] = parsed.pathname.split("/");
    if (["embed", "shorts", "live", "v"].includes(segment) && id) return id;

    return null;
  } catch {
    return null;
  }
}
