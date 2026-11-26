"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { logoutAction } from "@/actions/auth";
import { Dismiss, Navigation, Open, SignOut } from "@/components/fluent-icons";
import { cn } from "@/lib/utils";

import { AdminNav, NAV_ROW } from "./admin-nav";

/**
 * The admin's frame, built like the public site's (app/(site)/layout.tsx and
 * components/site-sidebar.tsx) so the two read as one product: the shell's
 * gradient behind everything, a fixed nav drawer on the left on desktop,
 * an app bar with a slide-in drawer on phones, and each page on a white
 * panel with rounded corners set into the chrome.
 */
export function AdminShell({
  name,
  email,
  portraitUrl,
  unread,
  children,
}: {
  name: string;
  email: string;
  portraitUrl: string | null;
  unread: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  // The drawer locks the page behind it while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const body = (onNavigate?: () => void) => (
    <ShellBody name={name} email={email} portraitUrl={portraitUrl} unread={unread} onNavigate={onNavigate} />
  );

  return (
    <div className="flex min-h-full flex-1 flex-col lg:pl-(--sidebar-width)">
      <div className="shell-bg fixed inset-0 -z-10" aria-hidden />

      {/* ---------- Desktop nav drawer ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) lg:block">{body()}</aside>

      {/* ---------- Phone app bar ---------- */}
      <div className="sticky top-0 z-40 border-b border-line bg-background lg:hidden">
        <div className="flex h-12 items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="btn btn-subtle btn-icon"
          >
            <Navigation />
          </button>
          <Link href="/admin" className="text-base font-semibold">
            Admin
          </Link>
          <span className="truncate text-sm text-faint">· {name}</span>
        </div>
      </div>

      {/* ---------- Phone nav drawer ---------- */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              className="shell-bg absolute inset-y-0 left-0 w-[min(18rem,85vw)] shadow-fluent-64"
              initial={{ x: reduced ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : "-100%" }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0, 0, 0, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="btn btn-subtle btn-icon absolute right-2 top-2 z-10"
              >
                <Dismiss />
              </button>
              {body(() => setOpen(false))}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ---------- The page, on its white panel ---------- */}
      <main className="flex flex-1 flex-col bg-background lg:my-2 lg:mr-2 lg:rounded-[8px] lg:shadow-fluent-4">
        <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function ShellBody({
  name,
  email,
  portraitUrl,
  unread,
  onNavigate,
}: {
  name: string;
  email: string;
  portraitUrl: string | null;
  unread: number;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 pb-3 pt-4">
      {/* ---------- Header: who is signed in, as a Persona ---------- */}
      <Link
        href="/admin"
        onClick={onNavigate}
        className="mx-1 flex items-center gap-3 rounded-[4px] p-1.5 transition-colors hover:bg-white/60"
      >
        <Avatar name={name} src={portraitUrl} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-faint">Admin</span>
        </span>
      </Link>

      <div className="mt-5">
        <AdminNav unread={unread} onNavigate={onNavigate} />
      </div>

      {/* ---------- Footer: out to the site, and out of the admin ---------- */}
      <div className="mt-auto grid gap-0.5 pt-5">
        <Link href="/" className={cn(NAV_ROW, "text-muted hover:bg-white/60 hover:text-foreground")}>
          <Open className="size-5 shrink-0" />
          View site
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={cn(NAV_ROW, "text-muted hover:bg-white/60 hover:text-foreground")}>
            <SignOut className="size-5 shrink-0" />
            Sign out
          </button>
        </form>
        <p className="truncate px-2.5 pt-2 text-xs text-faint" title={email}>
          Signed in as {email}
        </p>
      </div>
    </div>
  );
}

/** Fluent's Avatar, as in the site's drawer: the photo, or initials on a brand tint. */
function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-surface">
        <Image src={src} alt="" fill sizes="36px" className="object-cover object-top" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-hover">
      {initials}
    </span>
  );
}
