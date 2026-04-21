'use client';

import { useRef } from 'react';
import data from '../../public/resume.json';
import { fadeSlideRight, fadeSlideUp, staggerContainer } from '../../lib/motion.client';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

const FOCUS_AREAS = [
  'AI/ML Engineering',
  'Human-Centered Design',
  'Language Learning',
  'Interactive Systems',
  'Creative Technologist',
];

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  // Subtle scroll parallax on portrait
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <section
      ref={ref}
      id="about"
      className="max-w-5xl mx-auto px-4 py-24 min-h-screen grid md:grid-cols-2 gap-12 lg:gap-16 items-center scroll-mt-24"
    >
      {/* Portrait column */}
      <div className="relative justify-self-center">
        {/* Animated glow orb behind portrait */}
        <motion.div
          className="absolute inset-0 -z-10 rounded-full bg-accent-primary blur-3xl"
          animate={{ scale: [0.88, 1.04, 0.88], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Portrait with parallax */}
        <motion.div
          style={{ y: parallaxY }}
          variants={fadeSlideRight}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <Image
            src="/images/profile.jpg"
            width={420}
            height={420}
            alt="Deniz Gould portrait"
            className="rounded-2xl object-cover w-full max-w-[340px] md:max-w-[420px]"
          />
        </motion.div>
      </div>

      {/* Content column — no box/border */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="flex flex-col gap-5"
      >
        {/* Eyebrow */}
        <motion.p
          variants={fadeSlideUp}
          className="text-xs font-mono tracking-widest text-accent-primary uppercase"
        >
          About
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={fadeSlideUp}
          className="text-3xl md:text-4xl font-bold leading-tight"
        >
          {data.tagline}
        </motion.h1>

        {/* Short bio — 2 paragraphs */}
        <motion.p
          variants={fadeSlideUp}
          className="text-fg/70 leading-relaxed text-sm md:text-base max-w-[52ch]"
        >
          I'm an AI/ML-focused engineer fascinated by adaptive systems, language, and human-centered product design — building software where machine precision meets intuitive user experience.
        </motion.p>
        <motion.p
          variants={fadeSlideUp}
          className="text-fg/50 leading-relaxed text-sm max-w-[52ch]"
        >
          Beyond code, I'm drawn to cognitive psychology, music (bass &amp; sax), chess, and picking up new languages.
        </motion.p>

        {/* Focus tags */}
        <motion.div variants={fadeSlideUp} className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((area) => (
            <motion.span
              key={area}
              whileHover={{ y: -2 }}
              className="px-3 py-1 text-xs font-mono bg-accent-primary/10 text-accent-primary/80 border border-accent-primary/20 rounded-full hover:bg-accent-primary/20 transition-colors cursor-default"
            >
              {area}
            </motion.span>
          ))}
        </motion.div>

        {/* Currently building */}
        <motion.div
          variants={fadeSlideUp}
          className="flex items-center gap-2.5 text-xs font-mono text-fg/40 mt-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-pulse shrink-0" />
          Currently: Building AI-powered tools &amp; playful interactive web experiences.
        </motion.div>
      </motion.div>
    </section>
  );
}
