'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { playNote } from '../lib/audio';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/skills', label: 'Skills' },
  { href: '/projects', label: 'Projects' },
  { href: '/education', label: 'Education' }
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-bg/80 border-b border-fg/10">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-2">
        <Link 
          href="/" 
          onMouseEnter={playNote}
          className="font-mono text-accent-primary hover:text-accent-secondary transition-colors"
        >
          DG
        </Link>
        <ul className="hidden md:flex gap-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onMouseEnter={playNote}
                className={`transition-colors ${
                  pathname === href
                    ? 'text-accent-primary'
                    : 'text-fg hover:text-accent-secondary'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}