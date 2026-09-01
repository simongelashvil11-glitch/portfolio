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
import { experiences, profile, projects, skills, updates, users } from "./schema";

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
    role: "Digital Marketing Specialist",
    headline: "I help brands get found, get chosen and keep growing.",
    bio: "Digital marketing specialist working across SEO, paid media, content and email. I like campaigns that can be measured, messaging that sounds like a person wrote it, and reporting that says what to do next. Everything on this page is editable from the admin dashboard.",
    location: "Tbilisi, Georgia",
    email: "simongelashvil11@gmail.com",
    availability: "Available for new work",
    about:
      "I am a digital marketing specialist based in Tbilisi, working across SEO, paid media, content and email. Most of my work is with small teams and founders who need a channel to start earning its keep.\n\n## How I work\n\nI start with what can be measured, then work backwards to the message. A campaign that cannot be read in the numbers is a campaign nobody can improve.\n\n- Audit what is already running before adding anything new\n- Build the tracking first, so the first week of spend is not wasted\n- Write like a person, not like a brand guideline\n\nReplace all of this from the admin dashboard — it accepts headings, bullet lists and plain paragraphs.",
    socials: [
      { label: "LinkedIn", url: "https://linkedin.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  });

  await db.insert(experiences).values([
    {
      role: "Digital Marketing Specialist",
      company: "Freelance",
      startDate: "2023-01",
      endDate: null,
      description: "Running search, paid social and email campaigns end to end for small teams and founders.",
      sortOrder: 0,
    },
    {
      role: "Marketing Assistant",
      company: "Earlier role",
      startDate: "2021-06",
      endDate: "2022-12",
      description: "Replace this with your own history from the admin dashboard.",
      sortOrder: 1,
    },
  ]);

  await db.insert(projects).values([
    {
      title: "Brand Launch Campaign",
      slug: "brand-launch-campaign",
      summary: "Positioning, launch content and paid social for a new consumer brand.",
      description:
        "A full go-to-market push for a brand with no existing audience: positioning and messaging first, then a content calendar and a paid social plan built around it.\n\nSwap this text for a real case study, or clear it to make the row link straight out to the campaign instead.",
      // A Creative Commons clip, purely so the video thumbnail has something
      // to show before you paste in your own.
      videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      tags: ["Paid Social", "Content", "Launch"],
      year: "2025",
      featured: true,
      sortOrder: 0,
    },
    {
      title: "Search Growth Programme",
      slug: "search-growth-programme",
      summary: "A twelve-month SEO and content plan for an e-commerce catalogue.",
      url: "https://example.com",
      tags: ["SEO", "Content", "GA4"],
      year: "2026",
      sortOrder: 1,
    },
  ]);

  await db.insert(skills).values([
    { name: "SEO", category: "Channels", sortOrder: 0 },
    { name: "Google Ads", logoUrl: "https://cdn.simpleicons.org/googleads", category: "Channels", sortOrder: 1 },
    { name: "Meta Ads", logoUrl: "https://cdn.simpleicons.org/meta", category: "Channels", sortOrder: 2 },
    { name: "Email Marketing", category: "Channels", sortOrder: 3 },
    { name: "Social Media", category: "Channels", sortOrder: 4 },
    { name: "GA4", logoUrl: "https://cdn.simpleicons.org/googleanalytics", category: "Analytics", sortOrder: 0 },
    { name: "Google Tag Manager", logoUrl: "https://cdn.simpleicons.org/googletagmanager", category: "Analytics", sortOrder: 1 },
    { name: "Search Console", logoUrl: "https://cdn.simpleicons.org/googlesearchconsole", category: "Analytics", sortOrder: 2 },
    { name: "Looker Studio", logoUrl: "https://cdn.simpleicons.org/looker", category: "Analytics", sortOrder: 3 },
    { name: "HubSpot", logoUrl: "https://cdn.simpleicons.org/hubspot", category: "Tools", sortOrder: 0 },
    { name: "Mailchimp", logoUrl: "https://cdn.simpleicons.org/mailchimp", category: "Tools", sortOrder: 1 },
    { name: "Figma", logoUrl: "https://cdn.simpleicons.org/figma", category: "Tools", sortOrder: 2 },
    { name: "Canva", category: "Tools", sortOrder: 3 },
  ]);

  await db.insert(updates).values([
    {
      title: "Launched a full brand campaign end to end",
      url: "https://example.com",
      description:
        "Positioning, launch content and paid social for a new consumer brand, from the first workshop through to the reporting deck.",
      date: "2026-07",
      sortOrder: 0,
    },
    {
      title: "Certified in Google Analytics 4",
      logoUrl: "https://cdn.simpleicons.org/googleanalytics",
      description:
        "Finished the GA4 certification and rebuilt my reporting stack around it, so every campaign now reports on the same events.",
      date: "2025-03",
      sortOrder: 1,
    },
    {
      title: "Started freelancing full time",
      description:
        "Left agency work to run campaigns directly for small teams and founders. Best decision I have made so far.",
      date: "2023-01",
      sortOrder: 2,
    },
  ]);

  console.log("✓ placeholder profile, experience, projects, skills and updates inserted");
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
