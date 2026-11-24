type Social = { label: string; url: string };

export function SiteFooter({ name, socials }: { name: string; socials: Social[] }) {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 pb-3 pt-6 sm:flex-row sm:items-center sm:justify-between lg:px-10">
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
        </ul>
      </div>
      {/*
        The visit log keeps IP addresses, which are personal data; saying so
        plainly is the honest minimum. Kept to one quiet line.
      */}
      <p className="mx-auto w-full max-w-5xl px-6 pb-5 text-[11px] leading-4 text-faint lg:px-10">
        This site records visits — the page, approximate location, IP address and its network, and basic browser
        details — to see where readers come from. No cookies or fingerprinting; nothing is shared or sold.
      </p>
    </footer>
  );
}
