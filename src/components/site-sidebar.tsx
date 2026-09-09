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
import { useCallback, useEffect, useRef, useState } from "react";

import { ContactWindow } from "@/components/contact-window";
import { RailAppearance } from "@/components/rail-appearance";

type Social = { label: string; url: string };

type SidebarProps = {
  name: string;
  role: string | null;
  email: string | null;
  socials: Social[];
};

type NavItem = {
  /** Absent on an item that opens something instead of going somewhere. */
  href?: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  /** Opens the contact window rather than navigating. */
  dialog?: true;
};

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
    items: [{ label: "Contact", icon: Mail, shortcut: "4", dialog: true }],
  },
];

const ITEMS = GROUPS.flatMap((group) => group.items);

const SHORTCUTS = new Map(ITEMS.map((item) => [item.shortcut, item]));

/** Section ids in document order, which breaks ties on the line below. */
const SECTION_IDS = ITEMS.flatMap((item) => {
  const id = item.href?.split("#")[1];
  return id ? [id] : [];
});

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
  const reduced = useReducedMotion();

  /*
   * While a jump is travelling, the highlight belongs to where it is going,
   * not to where the page currently is.
   *
   * Without this the spy keeps measuring the whole way: choosing Work from
   * the top measures "not past the first section yet" for the opening frames
   * and flicks the highlight back to Home before catching up, and choosing
   * Contact walks it Home, Work, Contact as the scroll travels past each one.
   */
  const jumping = useRef(false);
  const endJump = useRef<(() => void) | null>(null);

  const beginJump = useCallback(() => {
    endJump.current?.();
    jumping.current = true;

    let timer = 0;
    const release = () => {
      jumping.current = false;
      window.removeEventListener("scrollend", release);
      window.clearTimeout(timer);
      endJump.current = null;
    };

    window.addEventListener("scrollend", release);
    /*
     * `scrollend` is not in every browser yet, and a jump with nowhere left
     * to travel — the last section already against the end of the page —
     * never fires one anywhere. The timer is what releases those.
     */
    timer = window.setTimeout(release, 1200);
    endJump.current = release;
  }, []);

  // Nothing should be left listening if the reader leaves mid-jump.
  useEffect(() => () => endJump.current?.(), []);

  useEffect(() => {
    if (pathname !== "/") return;

    function measure() {
      if (jumping.current) return;

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
      // Only handled here when the section is already on the page. From
      // another route there is nothing to scroll to yet, so the navigation
      // has to happen and the browser lands on the anchor itself.
      if (window.location.pathname !== "/") return false;

      const target = document.getElementById(sectionId);
      if (!target) return false;

      setActive(sectionId);

      /*
       * The address bar is updated before the scroll starts, not after, so
       * that anything the router does in response to the history change
       * cannot land on top of a scroll already under way. Skipped when it
       * would only repeat the entry already there, so pressing the same item
       * twice does not bury the previous page.
       */
      if (window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, "", href);
      }

      /*
       * Scrolled here rather than by following the link, because the router
       * manages scroll on navigation too: it looks for the first page element
       * and scrolls to that, which fought the anchor and showed up as the
       * view snapping back before it settled.
       *
       * Smooth is asked for here rather than set globally, so that route
       * changes still jump. The section's own `scroll-mt` sets the offset.
       */
      beginJump();
      target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      return true;
    }

    // Home is the one destination the browser will not move for on its own:
    // navigating to the URL you are already on does not scroll.
    if (href === "/" && window.location.pathname === "/") {
      beginJump();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      setActive(null);

      // The navigation is cancelled now that this is handled here, and with
      // it the hash would have survived — leaving the address bar pointing at
      // a section the reader has just scrolled away from, and a reload
      // landing back there.
      if (window.location.hash) window.history.pushState(null, "", "/");
      return true;
    }

    return false;
  }, [beginJump, reduced]);

  return { active: pathname === "/" ? active : null, select };
}

export function SiteSidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
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

      const item = SHORTCUTS.get(event.key);
      if (!item) return;

      if (item.dialog) {
        setContactOpen(true);
        return;
      }

      if (item.href && !select(item.href)) window.location.assign(item.href);
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

  /*
   * Closing the drawer sets state, but the effect above only releases the
   * lock once React has flushed — which is after the click handler has
   * already run its jump. A jump inside the drawer would therefore scroll a
   * page that still cannot move. Released here, in the same tick as the
   * click, so the scroll that follows lands. The effect's cleanup then
   * restores the same value, so the two do not disagree.
   */
  const closeForJump = useCallback(() => {
    setOpen(false);
    document.body.style.overflow = "";
  }, []);

  return (
    <>
      {/* ---------- Desktop rail ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) lg:block">
        <SidebarBody
          {...props}
          pathname={pathname}
          activeSection={activeSection}
          onSelect={select}
          contactOpen={contactOpen}
          onOpenContact={() => setContactOpen(true)}
          chrome
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
              className="aurora absolute inset-y-0 left-0 w-[min(20rem,85vw)] overflow-hidden border-r border-(--rail-line)"
              initial={{ x: reduced ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : "-100%" }}
              transition={{ duration: reduced ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-lg border border-(--rail-key-border) bg-(--rail-key-bg) text-(--rail-ink-strong) transition-colors hover:bg-(--rail-hover) hover:text-(--rail-ink)"
              >
                <X className="size-4" />
              </button>
              <SidebarBody
                {...props}
                pathname={pathname}
                activeSection={activeSection}
                onSelect={select}
                onNavigate={closeForJump}
                contactOpen={contactOpen}
                onOpenContact={() => setContactOpen(true)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ContactWindow open={contactOpen} onClose={() => setContactOpen(false)} />
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
  contactOpen,
  onOpenContact,
  chrome = false,
}: SidebarProps & {
  pathname: string;
  activeSection: string | null;
  onSelect: (href: string) => boolean;
  onNavigate?: () => void;
  contactOpen: boolean;
  onOpenContact: () => void;
  /** Window controls. The rail only — the drawer has its own close button. */
  chrome?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-6 overflow-y-auto px-4 py-6">
      <div>
        {/*
          The lights are what make the whole page read as a window rather than
          a site with a menu down one side, and they are the same ones used by
          `MacWindow` and the portrait card, so it is one vocabulary rather
          than three. Decoration, so hidden from assistive tech rather than
          announced as three unlabelled somethings.

          Sized and spaced as the real ones are: 12px across, 8px apart.
        */}
        {chrome ? (
          <div className="mb-7 flex items-center gap-2 px-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
        ) : null}

        <Link href="/" onClick={onNavigate} className="block px-3">
          <span className="font-display text-[0.9375rem] font-medium leading-tight tracking-display text-(--rail-ink)">
            {name}
          </span>
          {role ? (
            <span className="mt-0.5 block text-[0.6875rem] leading-relaxed text-(--rail-ink-mid)">
              {role}
            </span>
          ) : null}
        </Link>

        {/*
          Hairlines rather than wide gaps to separate the groups, which is how
          a sidebar of this kind is divided, and what lets the rows sit close
          enough together to read as a list.
        */}
        <nav className="mt-5 grid gap-5 border-t border-(--rail-line) pt-5">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.heading ?? `group-${groupIndex}`}>
              {group.heading ? (
                <h2 className="mb-1.5 px-3 text-[0.6875rem] font-medium text-(--rail-ink-mid)">
                  {group.heading}
                </h2>
              ) : null}

              <ul className="grid gap-0.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <NavRow
                      item={item}
                      pathname={pathname}
                      activeSection={activeSection}
                      onSelect={onSelect}
                      onNavigate={onNavigate}
                      contactOpen={contactOpen}
                      onOpenContact={onOpenContact}
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
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-1.5 text-[0.8125rem] text-(--rail-ink-strong) transition-colors hover:bg-(--rail-hover) hover:text-(--rail-ink)"
                  >
                    {social.label}
                    <ArrowUpRight className="size-3 shrink-0 text-(--rail-ink-hint)" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-(--rail-line) pt-4">
        <RailAppearance />

        {email ? (
          <a
            href={`mailto:${email}`}
            className="mt-2 block break-all rounded-md px-3 py-1.5 text-[0.6875rem] text-(--rail-ink-strong) transition-colors hover:bg-(--rail-hover) hover:text-(--rail-ink)"
          >
            {email}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function NavRow({
  item,
  pathname,
  activeSection,
  onSelect,
  onNavigate,
  contactOpen,
  onOpenContact,
}: {
  item: NavItem;
  pathname: string;
  activeSection: string | null;
  onSelect: (href: string) => boolean;
  onNavigate?: () => void;
  contactOpen: boolean;
  onOpenContact: () => void;
}) {
  const sectionId = item.href?.split("#")[1];

  // Anchors follow the section in view. Home is the home page with no section
  // reached yet, and every other route matches itself and anything under it.
  // The window item is lit while its window is up, which is the same idea:
  // the row shows what you are looking at.
  const active = item.dialog
    ? contactOpen
    : sectionId
      ? activeSection === sectionId
      : item.href === "/"
        ? pathname === "/" && activeSection === null
        : !!item.href && pathname.startsWith(item.href);

  const Icon = item.icon;

  const className = `flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-[0.8125rem] transition-colors ${
    active
      ? "bg-(--rail-active) text-(--rail-ink) inset-ring inset-ring-(--rail-ring)"
      : "text-(--rail-ink-strong) hover:bg-(--rail-hover) hover:text-(--rail-ink)"
  }`;

  // Shared so a row looks identical whether it navigates or opens a window.
  const inner = (
    <>
      <span className="flex items-center gap-2.5">
        <Icon className={`size-3.5 shrink-0 ${active ? "text-(--rail-ink)" : "text-(--rail-ink-faint)"}`} />
        {item.label}
      </span>
      {/*
        Drawn as a key rather than a loose digit. These really are shortcuts —
        pressing the number reaches the item — so they should look like
        something you press.
      */}
      <span className="tnum grid h-[17px] min-w-[17px] place-items-center rounded border border-(--rail-key-border) bg-(--rail-key-bg) px-1 text-[0.625rem] font-medium text-(--rail-ink-faint)">
        {item.shortcut}
      </span>
    </>
  );

  if (item.dialog) {
    return (
      <button
        type="button"
        onClick={() => {
          // Closes the drawer first on small screens, so the window is not
          // opened behind it.
          onNavigate?.();
          onOpenContact();
        }}
        aria-haspopup="dialog"
        aria-expanded={active}
        className={className}
      >
        {inner}
      </button>
    );
  }

  if (!item.href) return null;
  const href = item.href;

  return (
    <Link
      href={href}
      onClick={(event) => {
        onNavigate?.();
        // Cancels the router's navigation when the jump was handled here, so
        // the two do not both try to move the page.
        if (onSelect(href)) event.preventDefault();
      }}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {inner}
    </Link>
  );
}
