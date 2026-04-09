'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Github, Twitter, Instagram, ArrowRight } from 'lucide-react';
import { pageTransition } from '../lib/motion.client';
import data from '../public/resume.json';
import NavBar from './NavBar';

const socialLinks = [
  {
    icon: <Linkedin size={18} />,
    href: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`,
    label: 'LinkedIn',
  },
  {
    icon: <Github size={18} />,
    href: data.github.startsWith('http') ? data.github : `https://${data.github}`,
    label: 'GitHub',
  },
  {
    icon: <Twitter size={18} />,
    href: data.X.startsWith('http') ? data.X : `https://${data.X}`,
    label: 'X',
  },
  {
    icon: <Instagram size={18} />,
    href: data.instagram.startsWith('http') ? data.instagram : `https://${data.instagram}`,
    label: 'Instagram',
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg text-fg min-h-screen flex flex-col">
      <NavBar />
      <motion.main
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="pt-16 flex-1"
      >
        {children}
      </motion.main>

      <footer className="border-t border-fg/10">
        {/* Divider label */}
        <div className="flex items-center justify-center py-4 gap-3 text-fg/20 text-xs font-mono tracking-widest">
          <span className="h-px w-12 bg-fg/10" />
          d3nizg.dev
          <span className="h-px w-12 bg-fg/10" />
        </div>

        {/* Main footer row */}
        <div className="max-w-5xl mx-auto px-4 pb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <p className="text-sm text-fg/40 font-mono order-3 md:order-1">
            © {new Date().getFullYear()} Deniz Gould
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-5 order-1 md:order-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-fg/40 hover:text-accent-primary transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* CTA */}
          <a
            href={`mailto:${data.email}`}
            className="order-2 md:order-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-mono rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 transition-colors"
          >
            Get in touch
            <ArrowRight size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
}
