import Link from "next/link";

type Social = { label: string; url: string };

export function SiteFooter({ name, socials }: { name: string; socials: Social[] }) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p className="text-xs text-faint">
          © {new Date().getFullYear()} {name}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {socials.map((social) => (
            <li key={social.url}>
              <a href={social.url} target="_blank" rel="noreferrer noopener" className="fluent-link text-xs">
                {social.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/admin" className="text-xs text-faint hover:text-foreground hover:underline">
              Admin
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
