'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../lib/motion.client';
import NavBar from './NavBar';

export default function Layout({ children }: { children: ReactNode }) {
return (
<div className="bg-bg text-fg min-h-screen">
<NavBar />
<motion.main
variants={pageTransition}
initial="hidden"
animate="visible"
exit="exit"
className="pt-16"
>
{children}
</motion.main>
</div>
);
}