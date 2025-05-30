'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { fadeSlideUp } from '../../lib/motion.client';
import data from '../../public/resume.json';

const Game = dynamic(() => import('../../components/Game/MsPacMan'), { ssr: false, loading: () => null });

export default function HomePage() {
return (
<section className="flex flex-col items-center justify-center gap-8 text-center min-h-[calc(100vh-4rem)]">
<motion.h1
className="text-4xl md:text-6xl font-bold"
variants={fadeSlideUp}
initial="hidden"
animate="visible"
>
{data.name}
</motion.h1>
<motion.h2
className="text-xl md:text-2xl text-accent-secondary font-mono"
variants={fadeSlideUp}
initial="hidden"
animate="visible"
transition={{ delay: 0.2 }}
>
{data.title}
</motion.h2>
  <motion.div
    className="relative w-full max-w-md aspect-square"
    variants={fadeSlideUp}
    initial="hidden"
    animate="visible"
    transition={{ delay: 0.4 }}
  >
    <Game />
    <div className="absolute inset-0 pointer-events-none animate-pulse opacity-10">
      {/* subtle background particles placeholder */}
      <Image src="/images/particles.svg" alt="" fill />
    </div>
  </motion.div>
</section>
);
}