import { cn } from "@/lib/utils";

/**
 * A small starburst in Claude's orange, marking the places a step can run on
 * your Claude subscription (copy the prompt to claude.ai, paste the answer
 * back) instead of the paid API. A simple drawn mark, not Anthropic's logo
 * file.
 */
export function ClaudeMark({ className, title = "Also works with your Claude subscription (free)" }: { className?: string; title?: string }) {
  const rays = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * Math.PI) / 6;
    const outer = index % 2 === 0 ? 10 : 7.5;
    return {
      x1: 12 + Math.cos(angle) * 2.5,
      y1: 12 + Math.sin(angle) * 2.5,
      x2: 12 + Math.cos(angle) * outer,
      y2: 12 + Math.sin(angle) * outer,
    };
  });
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={title} className={cn("inline-block size-3.5 shrink-0", className)}>
      <title>{title}</title>
      {rays.map((ray, index) => (
        <line key={index} {...ray} stroke="#D97757" strokeWidth={2.4} strokeLinecap="round" />
      ))}
    </svg>
  );
}
