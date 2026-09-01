import Link from "next/link";

type Social = { label: string; url: string };

export function SiteFooter({ name, socials }: { name: string; socials: Social[] }) {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-12">
        <p className="text-sm text-faint">
          © {new Date().getFullYear()} {name}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {socials.map((social) => (
            <li key={social.url}>
              <a
                href={social.url}
                target="_blank"
                rel="noreferrer noopener"
                className="link-underline text-sm text-muted transition-colors hover:text-foreground"
              >
                {social.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/admin"
              className="link-underline text-sm text-faint transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
