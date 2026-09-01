"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Home,
  Layers,
  Mail,
  Menu,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Social = { label: string; url: string };

type SidebarProps = {
  name: string;
  role: string | null;
  email: string | null;
  socials: Social[];
};

type NavItem = { href: string; label: string; icon: LucideIcon; shortcut: string };

const GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    // The home page and the sections within it.
    heading: null,
    items: [
      { href: "/", label: "Home", icon: Home, shortcut: "1" },
      { href: "/#work", label: "Work", icon: Layers, shortcut: "2" },
    ],
  },
  {
    heading: null,
    items: [{ href: "/about", label: "About", icon: User, shortcut: "3" }],
  },
  {
    heading: "Connect",
    items: [{ href: "/#contact", label: "Contact", icon: Mail, shortcut: "4" }],
  },
];

const ITEMS = GROUPS.flatMap((group) => group.items);

const SHORTCUTS = new Map(ITEMS.map((item) => [item.shortcut, item.href]));

/** Section ids in document order, which breaks ties on the line below. */
const SECTION_IDS = ITEMS.map((item) => item.href.split("#")[1]).filter(Boolean);

/**
 * Tracks which home-page section the reader is looking at, so the anchor
 * items light up the same way the routed ones do.
 *
 * Measured straight from scroll position, rather than accumulated from
 * IntersectionObserver events. That distinction is the whole point: observer
 * state only updates when a boundary is crossed, so a smooth scroll ending
 * without crossing one leaves the highlight stranded wherever it was.
 * Deriving the answer from the current position means every scroll position
 * resolves correctly, including landing back at the top.
 *
 * The rule is simply: the current section is the last one whose top has
 * passed an imaginary line a third of the way down the viewport. Before the
 * first section that is nobody, which is the hero, which is Home.
 */
function useActiveSection(pathname: string) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;

    function measure() {
      const line = window.innerHeight * 0.3;
      let current: string | null = null;

      for (const id of SECTION_IDS) {
        const element = id ? document.getElementById(id) : null;
        if (!element) continue;
        if (element.getBoundingClientRect().top <= line) current = id;
      }

      setActive(current);
    }

    // Measured straight from the scroll event rather than deferred into
    // requestAnimationFrame: a frame that never runs would leave the throttle
    // latched and the highlight frozen wherever it happened to be. Four
    // reads per event is cheap, and the browser already caps scroll events
    // at one per frame.
    //
    // The first read is deferred only to keep it out of the effect body.
    const initial = setTimeout(measure, 0);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      clearTimeout(initial);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  /**
   * Called when a nav item is chosen, by click or by shortcut. Sets the
   * highlight from the destination immediately rather than waiting to observe
   * the resulting scroll: a programmatic jump does not reliably emit a scroll
   * event, and when it does not, the highlight stays stranded on wherever the
   * reader just was. Scrolling afterwards still corrects it.
   *
   * Returns whether it fully handled the jump, so callers know whether they
   * still need to navigate.
   */
  const select = useCallback((href: string) => {
    const sectionId = href.split("#")[1];
    if (sectionId) {
      setActive(sectionId);
      return false;
    }

    // Home is the one destination the browser will not move for on its own:
    // navigating to the URL you are already on does not scroll.
    if (href === "/" && window.location.pathname === "/") {
      // No explicit behaviour, so `scroll-behavior` decides — which keeps
      // this instant for anyone who prefers reduced motion.
      window.scrollTo({ top: 0 });
      setActive(null);
      return true;
    }

    return false;
  }, []);

  return { active: pathname === "/" ? active : null, select };
}

export function SiteSidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { active: activeSection, select } = useActiveSection(pathname);

  // The number badges are real: pressing one jumps to that section. Ignored
  // while the visitor is typing, so the contact form still behaves.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const href = SHORTCUTS.get(event.key);
      if (!href) return;
      if (!select(href)) window.location.assign(href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [select]);

  // A locked body keeps the page behind the drawer from scrolling away.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* ---------- Desktop rail ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) lg:block">
        <SidebarBody
          {...props}
          pathname={pathname}
          activeSection={activeSection}
          onSelect={select}
        />
      </aside>

      {/* ---------- Mobile bar ---------- */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-background/80 backdrop-blur-md lg:hidden">
        <div className="relative flex h-14 items-center justify-between px-5">
          <Link href="/" className="font-display text-lg tracking-display">
            {props.name}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      {/* ---------- Mobile drawer ---------- */}
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
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              className="aurora absolute inset-y-0 left-0 w-[min(20rem,85vw)] overflow-hidden border-r border-white/8"
              initial={{ x: reduced ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : "-100%" }}
              transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
              <SidebarBody
                {...props}
                pathname={pathname}
                activeSection={activeSection}
                onSelect={select}
                onNavigate={() => setOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** The rail and the drawer show identical content, so it lives in one place. */
function SidebarBody({
  name,
  role,
  email,
  socials,
  pathname,
  activeSection,
  onSelect,
  onNavigate,
}: SidebarProps & {
  pathname: string;
  activeSection: string | null;
  onSelect: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-8 overflow-y-auto px-4 py-7">
      <div>
        <Link href="/" onClick={onNavigate} className="block px-3">
          <span className="font-display text-xl leading-tight tracking-display text-white">
            {name}
          </span>
          {role ? (
            <span className="mt-1 block text-xs leading-relaxed text-white/45">{role}</span>
          ) : null}
        </Link>

        <nav className="mt-8 grid gap-6">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.heading ?? `group-${groupIndex}`}>
              {group.heading ? (
                <h2 className="mb-2 px-3 text-[0.7rem] font-medium text-white/35">
                  {group.heading}
                </h2>
              ) : null}

              <ul className="grid gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavRow
                      item={item}
                      pathname={pathname}
                      activeSection={activeSection}
                      onSelect={onSelect}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {socials.length > 0 ? (
            <ul className="grid gap-0.5">
              {socials.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[0.9375rem] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {social.label}
                    <ArrowUpRight className="size-3.5 shrink-0 text-white/30" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>

      {email ? (
        <a
          href={`mailto:${email}`}
          className="break-all rounded-lg px-3 py-2 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white"
        >
          {email}
        </a>
      ) : null}
    </div>
  );
}

function NavRow({
  item,
  pathname,
  activeSection,
  onSelect,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  activeSection: string | null;
  onSelect: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  const sectionId = item.href.split("#")[1];

  // Anchors follow the section in view. Home is the home page with no section
  // reached yet, and every other route matches itself and anything under it.
  const active = sectionId
    ? activeSection === sectionId
    : item.href === "/"
      ? pathname === "/" && activeSection === null
      : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={() => {
        onNavigate?.();
        onSelect(item.href);
      }}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-[0.9375rem] transition-colors ${
        active
          ? "bg-white/8 text-white inset-ring inset-ring-white/10"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className={`size-4 shrink-0 ${active ? "text-white" : "text-white/40"}`} />
        {item.label}
      </span>
      <span className="tnum text-[0.7rem] text-white/25">{item.shortcut}</span>
    </Link>
  );
}
