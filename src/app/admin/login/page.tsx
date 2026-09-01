import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl tracking-display">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Admin access to the portfolio content.</p>
        <div className="mt-8">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  );
}
