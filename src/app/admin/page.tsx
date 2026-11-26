  import { count, desc, eq } from "drizzle-orm";
  import { Open } from "@/components/fluent-icons";
  import Link from "next/link";

  import { Card, EmptyState, PageHeading } from "@/components/admin/ui";
  import { db } from "@/db";
  import { experiences, messages, posts, projects, skills } from "@/db/schema";
  import { requireSession } from "@/lib/auth";
  import { getProfile } from "@/lib/queries";
  import { formatDate } from "@/lib/utils";

  export const dynamic = "force-dynamic";

  export default async function AdminHome() {
    await requireSession();

    const [profile, experienceCount, projectCount, skillCount, postCount, unreadCount, recent] =
      await Promise.all([
        getProfile(),
        db.select({ value: count() }).from(experiences),
        db.select({ value: count() }).from(projects),
        db.select({ value: count() }).from(skills),
        db.select({ value: count() }).from(posts),
        db.select({ value: count() }).from(messages).where(eq(messages.read, false)),
        db.select().from(messages).orderBy(desc(messages.createdAt)).limit(5),
      ]);

    const stats = [
      { label: "Experience", value: experienceCount[0].value, href: "/admin/experience" },
      { label: "Projects", value: projectCount[0].value, href: "/admin/projects" },
      { label: "Skills", value: skillCount[0].value, href: "/admin/skills" },
      { label: "Posts", value: postCount[0].value, href: "/admin/posts" },
      { label: "Unread", value: unreadCount[0].value, href: "/admin/messages" },
    ];

    return (
      <>
        <PageHeading
          title="Overview"
          description={
            profile
              ? `Editing the portfolio for ${profile.name}.`
              : "Start by filling in your profile."
          }
          action={
            <Link
              href="/"
              className="btn btn-secondary"
            >
              View site
              <Open />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="group">
              <Card className="card-interactive">
                <p className="tnum text-[28px] font-semibold leading-9">{stat.value}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {stat.label}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="mb-3 text-base font-semibold leading-[22px]">
            Recent messages
          </h2>

          {recent.length === 0 ? (
            <EmptyState>No messages yet.</EmptyState>
          ) : (
            <ul className="grid gap-2">
              {recent.map((message) => (
                <li key={message.id}>
                  <Link href="/admin/messages" className="block">
                    <Card className="card-interactive">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                          {message.name}
                          {!message.read ? (
                            <span className="ml-2 rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-hover">
                              New
                            </span>
                          ) : null}
                        </p>
                        <time className="tnum text-xs text-faint">
                          {formatDate(message.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted">{message.body}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }
