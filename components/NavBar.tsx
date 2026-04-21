'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { playNote } from '../lib/audio';
import ThemeToggle from './ThemeToggle';
import SoundToggle from './SoundToggle';

const links = [
  { href: '/', anchor: '#home', label: 'Home' },
  { href: '/about', anchor: '#about', label: 'About' },
  { href: '/projects', anchor: '#projects', label: 'Projects' },
  { href: '/skills', anchor: '#skills', label: 'Skills' },
  { href: '/education', anchor: '#education', label: 'Education' },
];

export default function NavBar() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  return (
    <>
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

          {/* Desktop nav */}
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
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 rounded text-fg/80 hover:text-accent-primary transition-colors"
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setDrawerOpen((o) => !o)}
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-64 z-50 bg-bg border-l border-fg/10 flex flex-col pt-16 md:hidden"
            >
              <ul className="flex flex-col px-6 py-4 gap-1">
                {links.map(({ href, anchor, label }) => {
                  const active = pathname === href;

                  if (isHomePage) {
                    return (
                      <li key={href}>
                        <a
                          href={anchor}
                          onClick={() => setDrawerOpen(false)}
                          className={`block py-3 text-lg border-b border-fg/10 transition-colors ${
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
                        onClick={() => setDrawerOpen(false)}
                        className={`block py-3 text-lg border-b border-fg/10 transition-colors ${
                          active ? 'text-accent-primary' : 'text-fg hover:text-accent-secondary'
                        }`}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
