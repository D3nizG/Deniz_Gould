'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { playNote } from '../lib/audio';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';

const links = [
  { href: '/', anchor: '#home', label: 'Home' },
  { href: '/about', anchor: '#about', label: 'About' },
  { href: '/skills', anchor: '#skills', label: 'Skills' },
  { href: '/projects', anchor: '#projects', label: 'Projects' },
  { href: '/education', anchor: '#education', label: 'Education' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-bg/80 border-b border-fg/10">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-2">
        {isHomePage ? (
          <a
            href="#home"
            onMouseEnter={playNote}
            className="font-mono text-accent-primary hover:text-accent-secondary transition-colors"
          >
            DG
          </a>
        ) : (
          <Link
            href="/"
            onMouseEnter={playNote}
            className="font-mono text-accent-primary hover:text-accent-secondary transition-colors"
          >
            DG
          </Link>
        )}
        <ul className="hidden md:flex gap-6">
          {links.map(({ href, anchor, label }) => {
            const active = pathname === href;

            if (isHomePage) {
              return (
                <li key={href}>
                  <a
                    href={anchor}
                    onMouseEnter={playNote}
                    className={`transition-colors ${
                      active ? 'text-accent-primary' : 'text-fg hover:text-accent-secondary'
                    }`}
                  >
                    {label}
                  </a>
                </li>
              );
            }

            return (
            <li key={href}>
              <Link
                href={href}
                onMouseEnter={playNote}
                className={`transition-colors ${
                  active ? 'text-accent-primary' : 'text-fg hover:text-accent-secondary'
                }`}
              >
                {label}
              </Link>
            </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
