'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../lib/motion.client';
import NavBar from './NavBar';

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
      <footer className="py-6 text-center text-sm text-fg/60 border-t border-fg/10">
        <p>© 2025 Deniz Gould. All rights reserved.</p>
      </footer>
    </div>
  );
}