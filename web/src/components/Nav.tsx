"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/organizers", label: "Organizers" },
  { href: "/conferences", label: "Conferences" },
  { href: "/globe", label: "🌐 Globe" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-hairline bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-ink">
            C
          </span>
          <span className="hidden sm:inline">Codabench Competitions</span>
        </span>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <span className="hidden truncate text-xs text-ink-muted md:inline">
          Fields, sectors &amp; conferences inferred from title + description
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
