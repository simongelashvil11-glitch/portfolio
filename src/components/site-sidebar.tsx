"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ContactWindow, OPEN_CONTACT } from "@/components/contact-window";
import {
  Briefcase,
  Dismiss,
  Home,
  Mail,
  Navigation,
  Open,
  Person,
  type FluentIcon,
} from "@/components/fluent-icons";

type Social = { label: string; url: string };

type SidebarProps = {
  name: string;
  role: string | null;
  email: string | null;
  portraitUrl: string | null;
  socials: Social[];
};

type NavItem = {
  /** Absent on an item that opens something instead of going somewhere. */
  href?: string;
  label: string;
  icon: FluentIcon;
  shortcut: string;
  /** Opens the contact window rather than navigating. */
  dialog?: true;
};

const GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    // The pages. One list, as Fluent's nav drawer opens with its main items.
    heading: null,
    items: [
      { href: "/", label: "Home", icon: Home, shortcut: "1" },
      { href: "/#work", label: "Work", icon: Briefcase, shortcut: "2" },
      { href: "/about", label: "About", icon: Person, shortcut: "3" },
    ],
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

  // The number keys reach their items: press 2 for Work. Ignored while the
  // visitor is typing, so the contact form still behaves.
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

  // Buttons elsewhere on the page ask for the contact dialog by event, since
  // the dialog's state lives here with the nav item that also opens it.
  useEffect(() => {
    const openContact = () => setContactOpen(true);
    window.addEventListener(OPEN_CONTACT, openContact);
    return () => window.removeEventListener(OPEN_CONTACT, openContact);
  }, []);

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
      {/* ---------- Desktop nav drawer ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) lg:block">
        <SidebarBody
          {...props}
          pathname={pathname}
          activeSection={activeSection}
          onSelect={select}
          contactOpen={contactOpen}
          onOpenContact={() => setContactOpen(true)}
        />
      </aside>

      {/* ---------- Mobile app bar ---------- */}
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
          <Link href="/" className="text-base font-semibold">
            {props.name}
          </Link>
        </div>
      </div>

      {/* ---------- Mobile nav drawer (overlay) ---------- */}
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
              className="absolute inset-y-0 left-0 shell-bg w-[min(18rem,85vw)] shadow-fluent-64"
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

/** Row metrics shared by every item in the drawer, after Fluent's NavItem. */
const ROW =
  "relative flex min-h-10 w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left text-sm transition-colors duration-100";

/** The drawer on desktop and the overlay on phones show the same content. */
function SidebarBody({
  name,
  role,
  email,
  portraitUrl,
  socials,
  pathname,
  activeSection,
  onSelect,
  onNavigate,
  contactOpen,
  onOpenContact,
}: SidebarProps & {
  pathname: string;
  activeSection: string | null;
  onSelect: (href: string) => boolean;
  onNavigate?: () => void;
  contactOpen: boolean;
  onOpenContact: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-2 pb-3 pt-4">
      {/* ---------- Header: the owner, as a Persona ---------- */}
      <Link
        href="/"
        onClick={onNavigate}
        className="mx-1 flex items-center gap-3 rounded-[4px] p-1.5 transition-colors hover:bg-white/60"
      >
        <Avatar name={name} src={portraitUrl} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {role ? <span className="block truncate text-xs text-faint">{role}</span> : null}
        </span>
      </Link>

      <nav aria-label="Main" className="mt-5 grid gap-5">
        {GROUPS.map((group, groupIndex) => (
          <div key={group.heading ?? `group-${groupIndex}`}>
            {group.heading ? (
              <h2 className="px-2.5 pb-1 text-xs font-semibold text-faint">{group.heading}</h2>
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
          <div>
            <h2 className="px-2.5 pb-1 text-xs font-semibold text-faint">Elsewhere</h2>
            <ul className="grid gap-0.5">
              {socials.map((social) => (
                <li key={social.url}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`${ROW} text-muted hover:bg-white/60 hover:text-foreground`}
                  >
                    <Open className="size-5 shrink-0" />
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      {email ? (
        <a
          href={`mailto:${email}`}
          className="mt-auto block truncate rounded-[4px] px-2.5 py-2 text-xs text-faint transition-colors hover:bg-white/60 hover:text-foreground"
        >
          {email}
        </a>
      ) : null}
    </div>
  );
}

/**
 * Fluent's Avatar: a circle holding the photo, or initials on a brand tint
 * when there is no photo.
 */
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
  // The dialog item is lit while its dialog is up, which is the same idea:
  // the row shows what you are looking at.
  const active = item.dialog
    ? contactOpen
    : sectionId
      ? activeSection === sectionId
      : item.href === "/"
        ? pathname === "/" && activeSection === null
        : !!item.href && pathname.startsWith(item.href);

  const Icon = item.icon;

  /*
   * Fluent's selected NavItem: a filled icon, semibold label, a darker fill
   * and the brand-coloured indicator bar on its leading edge.
   */
  const className = `${ROW} ${
    active
      ? "bg-white/80 font-semibold text-foreground shadow-fluent-2"
      : "text-muted hover:bg-white/60 hover:text-foreground"
  }`;

  const inner = (
    <>
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-lavender" aria-hidden />
      ) : null}
      <Icon filled={active} className={`size-5 shrink-0 ${active ? "text-lavender" : ""}`} />
      {item.label}
    </>
  );

  if (item.dialog) {
    return (
      <button
        type="button"
        onClick={() => {
          // Closes the drawer first on small screens, so the dialog is not
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
