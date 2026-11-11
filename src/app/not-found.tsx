import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 bg-background flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <p className="text-sm font-semibold text-faint">404</p>
      <h1 className="text-[28px] font-semibold leading-9">That page does not exist.</h1>
      <Link
        href="/"
        className="btn btn-primary mt-2"
      >
        Back home
      </Link>
    </main>
  );
}
