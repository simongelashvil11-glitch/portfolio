import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The small square that sits before a title in the work list and on the
 * about page. Logos arrive at every shape and ratio, so the tile is fixed and
 * the artwork is contained inside it with a little air. Without one, the
 * first letter stands in so rows of mixed content stay aligned.
 *
 * Left unoptimized on purpose: a 36px mark gains nothing from the optimizer,
 * and skipping it means any source works — including the SVG logo CDNs serve
 * from extensionless URLs, which the optimizer rejects.
 */
export function Mark({
  src,
  label,
  size = "md",
  className,
}: {
  src?: string | null;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const small = size === "sm";
  const shell = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface transition-colors group-hover:border-white/20",
    small ? "size-7" : "size-9",
  );

  if (!src) {
    return (
      <span
        className={cn(shell, small ? "text-xs" : "text-sm", "font-medium text-faint", className)}
        aria-hidden
      >
        {label.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={cn("relative", shell, className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="36px"
        unoptimized
        className={cn("object-contain", small ? "p-1" : "p-1.5")}
      />
    </span>
  );
}
