import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-faint">404</p>
      <h1 className="font-display text-4xl tracking-tight">That page does not exist.</h1>
      <Link
        href="/"
        className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
      >
        Back home
      </Link>
    </main>
  );
}
