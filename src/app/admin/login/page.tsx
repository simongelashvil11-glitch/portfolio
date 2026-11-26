import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      {/* The site's shell gradient behind a white Fluent card. */}
      <div className="shell-bg fixed inset-0 -z-10" aria-hidden />
      <div className="card w-full max-w-sm p-8 shadow-fluent-16">
        <h1 className="text-[28px] font-semibold leading-9">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Admin access to the portfolio content.</p>
        <div className="mt-8">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  );
}
