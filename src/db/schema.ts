import {
  boolean,
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

export type Profile = typeof profile.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Update = typeof updates.$inferSelect;
export type Message = typeof messages.$inferSelect;
