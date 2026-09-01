# Portfolio

A portfolio site with a database-backed admin dashboard, built to deploy on Vercel.

- **Next.js 16** (App Router, server actions) + **React 19**
- **Tailwind CSS v4**, monochrome dark palette with an animated gradient sidebar
- **Neon Postgres** via **Drizzle ORM**
- Cookie session auth for a single admin account
- **Motion** for scroll reveals and the mobile nav drawer

## Routes

| Route              | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `/`                | Time-of-day greeting, selected work, contact                     |
| `/about`           | About copy, personal updates, tech stack, career                 |
| `/projects/[slug]` | Case study (only for projects with body text), with video player |
| `/writing`         | Post index — built and reachable, but not linked in the nav       |
| `/writing/[slug]`  | Post                                                             |
| `/admin`           | Dashboard, grouped by the page each section feeds                |

Public pages share one shell in `src/app/(site)/layout.tsx`: a fixed gradient
sidebar with the content as an inset panel beside it.

Everything on the public site is edited from `/admin`. Nothing is hard-coded.

## Local setup

1. Create a Postgres database at [neon.tech](https://neon.tech) (free tier is fine)
   and copy the pooled connection string.
2. Fill in `.env.local`:

   ```
   DATABASE_URL="postgresql://…"
   ADMIN_EMAIL="you@example.com"
   ADMIN_PASSWORD="a password of 10+ characters"
   AUTH_SECRET="…"            # already generated
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"
   ```

3. Create the tables and the admin account:

   ```bash
   bun run db:push     # apply the schema
   bun run db:seed     # create the admin user + placeholder content
   ```

4. Run it:

   ```bash
   bun run dev
   ```

   Public site at `/`, dashboard at `/admin`.

## Scripts

| Command               | Does                                              |
| --------------------- | ------------------------------------------------- |
| `bun run dev`         | Dev server                                        |
| `bun run build`       | Production build (needs `DATABASE_URL`)           |
| `bun run typecheck`   | `tsc --noEmit`                                    |
| `bun run lint`        | ESLint                                            |
| `bun run db:push`     | Push the schema straight to the database          |
| `bun run db:generate` | Write a migration file from schema changes        |
| `bun run db:migrate`  | Apply pending migrations                          |
| `bun run db:studio`   | Drizzle Studio, a GUI over the data               |
| `bun run db:seed`     | Create/refresh the admin account, seed placeholders |

Note: `next build` and `next dev` both write to `.next`, so running a build
while the dev server is up will stop the dev server.

## Deploying to Vercel

1. Push this repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
2. Add the same four environment variables in **Settings → Environment Variables**,
   with `NEXT_PUBLIC_SITE_URL` set to the real domain.
3. Deploy. Add the custom domain under **Settings → Domains** whenever it is ready
   and update `NEXT_PUBLIC_SITE_URL` to match.

`ADMIN_PASSWORD` is only read by the seed script — the running app checks the
bcrypt hash stored in the database, so it is safe to change or drop the variable
after seeding.

## Adding a new content type later

The pattern is the same for every resource, so copying one is quick:

1. Add a table in `src/db/schema.ts`, then `bun run db:generate && bun run db:migrate`.
2. Add read helpers in `src/lib/queries.ts`.
3. Add `save…` / `delete…` server actions in `src/actions/admin.ts`.
4. Add a form in `src/components/admin/`, a list page and an `[id]` page under
   `src/app/admin/`, and a nav entry in `src/components/admin/admin-nav.tsx`.
5. Render it on the public page.
