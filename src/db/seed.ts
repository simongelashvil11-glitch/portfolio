/**
 * Creates the admin account and, on an empty database, a little placeholder
 * content so the site renders before you have written anything.
 *
 *   bun run db:seed
 *
 * Safe to re-run: the admin password is refreshed from the env file and
 * existing content is left alone.
 */
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";

import { db } from "./index";
import { experiences, profile, projects, skills, users } from "./schema";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local before seeding.");
  }
  if (password.length < 10) {
    throw new Error("Pick an ADMIN_PASSWORD of at least 10 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing) {
    await db.update(users).set({ passwordHash }).where(eq(users.id, existing.id));
    console.log(`✓ admin password updated for ${email}`);
  } else {
    await db.insert(users).values({ email, passwordHash });
    console.log(`✓ admin created: ${email}`);
  }
}

async function seedContent() {
  const [{ value: profileCount }] = await db.select({ value: count() }).from(profile);

  if (profileCount > 0) {
    console.log("· content already present, skipping placeholders");
    return;
  }

  await db.insert(profile).values({
    id: 1,
    name: "Simon Gelashvili",
    headline: "I design and build fast, considered web products.",
    bio: "Full-stack developer working mostly with Next.js, TypeScript and Postgres. I like interfaces that feel quick and get out of the way. Everything on this page is editable from the admin dashboard.",
    location: "Tbilisi, Georgia",
    email: "simongelashvil11@gmail.com",
    availability: "Available for new work",
    socials: [
      { label: "GitHub", url: "https://github.com" },
      { label: "LinkedIn", url: "https://linkedin.com" },
    ],
  });

  await db.insert(experiences).values([
    {
      role: "Full-stack Developer",
      company: "Freelance",
      startDate: "2023-01",
      endDate: null,
      description: "Building web products end to end for small teams and founders.",
      highlights: [
        "Shipped several Next.js applications from first sketch to production.",
        "Handled design, implementation, deployment and ongoing maintenance.",
      ],
      sortOrder: 0,
    },
    {
      role: "Web Developer",
      company: "Earlier role",
      startDate: "2021-06",
      endDate: "2022-12",
      description: "Replace this with your own history from the admin dashboard.",
      highlights: [],
      sortOrder: 1,
    },
  ]);

  await db.insert(projects).values([
    {
      title: "Metal Works",
      slug: "metal-works",
      summary: "A marketing site and catalogue for a metal fabrication company.",
      description:
        "A full Next.js site built for a metal works company, covering the public catalogue, enquiry handling and a content dashboard.\n\nSwap this text for a real case study, or clear it to make the row link straight out to the live site instead.",
      tags: ["Next.js", "MySQL", "Design"],
      year: "2025",
      featured: true,
      sortOrder: 0,
    },
    {
      title: "This portfolio",
      slug: "portfolio",
      summary: "The site you are reading, with a database-backed admin dashboard.",
      url: "https://github.com",
      tags: ["Next.js", "Drizzle", "Postgres"],
      year: "2026",
      sortOrder: 1,
    },
  ]);

  await db.insert(skills).values([
    { name: "TypeScript", category: "Engineering", sortOrder: 0 },
    { name: "Next.js", category: "Engineering", sortOrder: 1 },
    { name: "React", category: "Engineering", sortOrder: 2 },
    { name: "Node.js", category: "Engineering", sortOrder: 3 },
    { name: "Postgres", category: "Data", sortOrder: 0 },
    { name: "MySQL", category: "Data", sortOrder: 1 },
    { name: "Drizzle ORM", category: "Data", sortOrder: 2 },
    { name: "Tailwind CSS", category: "Design", sortOrder: 0 },
    { name: "Figma", category: "Design", sortOrder: 1 },
  ]);

  console.log("✓ placeholder profile, experience, projects and skills inserted");
}

async function main() {
  await seedAdmin();
  await seedContent();
  console.log("\nDone. Sign in at /admin/login");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
