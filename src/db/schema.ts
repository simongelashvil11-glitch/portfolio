import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Single admin user. Seeded once; no public sign-up. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Singleton row (id = 1) holding the "about me" content. */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey().default(1),
  name: varchar("name", { length: 120 }).notNull(),
  /** Short job title, shown under the name in the sidebar. */
  role: varchar("role", { length: 120 }),
  headline: varchar("headline", { length: 200 }).notNull(),
  bio: text("bio").notNull(),
  location: varchar("location", { length: 120 }),
  email: varchar("email", { length: 255 }),
  availability: varchar("availability", { length: 120 }),
  /** Phone number for WhatsApp, as written ("+995 551 …"). Blank hides the button. */
  whatsapp: varchar("whatsapp", { length: 32 }),
  /** Scrolling strip above the email in the sidebar. Blank hides the strip. */
  ticker: varchar("ticker", { length: 200 }),
  /*
   * The about page. Headings are nullable and fall back to sensible defaults
   * in the page itself, so a blank field never renders an empty heading.
   */
  aboutTitle: varchar("about_title", { length: 120 }),
  /** Portrait shown beside the about intro. A URL, or a path in /public. */
  portraitUrl: text("portrait_url"),
  /** Long-form copy for the about page. Same small Markdown subset as posts. */
  about: text("about"),
  updatesHeading: varchar("updates_heading", { length: 120 }),
  techHeading: varchar("tech_heading", { length: 120 }),
  techIntro: text("tech_intro"),
  careerHeading: varchar("career_heading", { length: 120 }),
  careerIntro: text("career_intro"),
  resumeUrl: text("resume_url"),
  /**
   * A showreel for the homepage, under the hero: a silent looping clip on
   * the site (/showreel.mp4) or a YouTube link. Hidden while empty. Added to
   * the database by hand, like signals.
   */
  showreelUrl: varchar("showreel_url", { length: 300 }),
  socials: jsonb("socials").$type<{ label: string; url: string }[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  companyUrl: text("company_url"),
  /** Company mark, shown beside the role in the Career list. */
  logoUrl: text("logo_url"),
  /** Free-form "YYYY-MM" so the form stays a plain text input. */
  startDate: varchar("start_date", { length: 20 }).notNull(),
  /** null => "Present" */
  endDate: varchar("end_date", { length: 20 }),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * One figure in a project's statistics window. The value is text, written
 * exactly as it should read ("$88,265", "72.99M", "0.68%"), so no formatting
 * rule has to guess at currencies or units. Figures with the same `group`
 * are shown together under that heading, in list order; a `featured` figure
 * is set large across the top instead.
 */
export type ProjectStat = {
  label: string;
  value: string;
  group: string;
  featured: boolean;
};

/**
 * A standout campaign, shown as a card in the statistics window. `tag` is
 * the small line above the name ("Messaging · highest volume"). The first
 * figure is the result and is set large; the rest are label/value rows.
 * Values are text for the same reason as `ProjectStat`.
 */
export type ProjectCampaign = {
  tag: string;
  name: string;
  figures: { label: string; value: string }[];
};

/**
 * An article about the project, shown as a press card on the case study.
 * `title` is the headline as it should read here (translated if need be);
 * `originalTitle` is the headline as published, shown beneath it when the
 * two differ. `image` is a URL or a path in /public.
 */
export type ProjectPress = {
  outlet: string;
  date: string;
  title: string;
  originalTitle: string;
  summary: string;
  url: string;
  image: string;
};

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  summary: text("summary").notNull(),
  description: text("description"),
  url: text("url"),
  repoUrl: text("repo_url"),
  imageUrl: text("image_url"),
  /** Small square mark shown before the title in the work list. */
  logoUrl: text("logo_url"),
  /** YouTube link. Renders a thumbnail on the row that opens an inline player. */
  videoUrl: text("video_url"),
  /**
   * A short silent clip (a site path such as /previews/isroa.mp4) played on
   * the work card while it is hovered. Without one, a video project's card
   * cycles through its YouTube stills instead. Added by hand, like signals.
   */
  previewUrl: varchar("preview_url", { length: 300 }),
  /** Extra images for the case study, shown as a grid that opens a lightbox. */
  gallery: jsonb("gallery").$type<string[]>().default([]).notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  /*
   * The statistics window on the case study. Its heading and a source line
   * ("Meta Ads Manager · lifetime") sit in the title bar; the figures are an
   * ordered list. An empty list hides the window.
   */
  statsTitle: varchar("stats_title", { length: 120 }),
  statsNote: varchar("stats_note", { length: 200 }),
  stats: jsonb("stats").$type<ProjectStat[]>().default([]).notNull(),
  /** Heading over the campaign cards; defaults to "Best campaigns". */
  campaignsTitle: varchar("campaigns_title", { length: 120 }),
  campaigns: jsonb("campaigns").$type<ProjectCampaign[]>().default([]).notNull(),
  /** Articles about the project. An empty list hides the press window. */
  press: jsonb("press").$type<ProjectPress[]>().default([]).notNull(),
  year: varchar("year", { length: 12 }),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).default("General").notNull(),
  /** Tool mark, shown beside the name in the Tech stack list. */
  logoUrl: text("logo_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Milestones listed on the about page: a mark, a headline, a date. */
export const updates = pgTable("updates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  /** Optional; the headline links out to it when set. */
  url: text("url"),
  logoUrl: text("logo_url"),
  description: text("description"),
  /** Free-form "YYYY-MM" so the form stays a plain text input. */
  date: varchar("date", { length: 20 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Contact form submissions, readable in the admin inbox. */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/*
 * The secondary list under the Tech stack chips. Kept apart from `skills`
 * rather than flagged inside it: a chip is a mark and a name, these are a
 * name, a link and a line of prose, and folding both into one row would
 * leave half its columns empty whichever kind it held.
 */
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  /** Where the tool lives. The name links out to it when set. */
  url: text("url"),
  /** One short line. The list is a reference, not a review. */
  description: varchar("description", { length: 200 }),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/*
 * One row per page view on the public site, for the Visitors page in the
 * admin. Location comes from the headers Vercel adds to every request, so
 * nothing is looked up from a third party. The owner's own visits (a valid
 * admin session), bots and local development are never recorded.
 *
 * The IP is personal data in most jurisdictions; it is kept because the
 * owner asked for it, and the admin page can clear old rows.
 */
export const visits = pgTable(
  "visits",
  {
    id: serial("id").primaryKey(),
    path: varchar("path", { length: 300 }).notNull(),
    /** ISO 3166-1 alpha-2, e.g. "GE". Null when the host did not say. */
    country: varchar("country", { length: 2 }),
    region: varchar("region", { length: 80 }),
    city: varchar("city", { length: 120 }),
    ip: varchar("ip", { length: 64 }),
    /** Where the visitor came from: the referring host, or null if direct. */
    referrer: varchar("referrer", { length: 300 }),
    device: varchar("device", { length: 16 }),
    browser: varchar("browser", { length: 40 }),
    os: varchar("os", { length: 40 }),
    /** Who owns the address: carrier, ISP, company or cloud host (see lib/network). */
    network: varchar("network", { length: 120 }),
    asn: integer("asn"),
    /** The network is a hosting or cloud provider: a server, VPN or relay, not a home or office line. */
    cloud: boolean("cloud"),
    /** Campaign tags from the landing URL (?utm_source=…), when a link carried them. */
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    /** Browser window size, e.g. "1440x900". */
    screen: varchar("screen", { length: 16 }),
    /** The browser's preferred language, e.g. "ka-GE". */
    lang: varchar("lang", { length: 35 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("visits_created_at_idx").on(table.createdAt)],
);

// Created by hand before it was in this file; the column types below match
// that table, so db:push leaves them alone.
export const signals = pgTable("signals", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  visitorHash: text("visitor_hash"),
  sessionId: text("session_id"),
  signalType: text("signal_type").notNull(),
  signalKey: text("signal_key"),
  signalValue: text("signal_value"),
  path: text("path"),
  ip: varchar("ip", { length: 64 }),
  /** Same identity fields as visits, recorded the same way (lib/request-identity, lib/network). */
  country: varchar("country", { length: 2 }),
  region: varchar("region", { length: 80 }),
  city: varchar("city", { length: 120 }),
  network: varchar("network", { length: 120 }),
  asn: integer("asn"),
  cloud: boolean("cloud"),
  device: varchar("device", { length: 16 }),
  browser: varchar("browser", { length: 40 }),
  os: varchar("os", { length: 40 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Update = typeof updates.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Signal = typeof signals.$inferSelect;