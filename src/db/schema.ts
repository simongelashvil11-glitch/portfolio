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
  headline: varchar("headline", { length: 200 }).notNull(),
  bio: text("bio").notNull(),
  location: varchar("location", { length: 120 }),
  email: varchar("email", { length: 255 }),
  availability: varchar("availability", { length: 120 }),
  resumeUrl: text("resume_url"),
  socials: jsonb("socials").$type<{ label: string; url: string }[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  companyUrl: text("company_url"),
  /** Free-form "YYYY-MM" so the form stays a plain text input. */
  startDate: varchar("start_date", { length: 20 }).notNull(),
  /** null => "Present" */
  endDate: varchar("end_date", { length: 20 }),
  description: text("description"),
  highlights: jsonb("highlights").$type<string[]>().default([]).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  summary: text("summary").notNull(),
  description: text("description"),
  url: text("url"),
  repoUrl: text("repo_url"),
  imageUrl: text("image_url"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
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

/** Contact form submissions, readable in the admin inbox. */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Message = typeof messages.$inferSelect;
