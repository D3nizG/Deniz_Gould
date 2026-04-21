'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import data from '@/public/resume.json';
import { fadeSlideUp } from '@/lib/motion.client';

function isPrimary(color: string) {
  return color === '#64FFDA';
}

function LevelDots({ level, primary }: { level: number; primary: boolean }) {
  const filled = Math.round(level);
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < filled
              ? primary ? 'bg-accent-primary' : 'bg-accent-secondary'
              : 'bg-fg/15'
          }`}
        />
      ))}
    </div>
  );
}

interface SkillItem { name: string; level: number; years: string; }

function SkillCard({ item, categoryName, categoryIcon, color }: {
  item: SkillItem;
  categoryName: string;
  categoryIcon: string;
  color: string;
}) {
  const primary = isPrimary(color);
  return (
    <motion.div
      whileHover={{
        y: -5,
        boxShadow: primary
          ? '0 8px 28px rgba(100,255,218,0.12)'
          : '0 8px 28px rgba(255,184,107,0.12)',
      }}
      className={`shrink-0 w-60 h-44 flex flex-col gap-2.5 p-4 rounded-xl border transition-colors ${
        primary
          ? 'bg-accent-primary/5 border-accent-primary/20 hover:border-accent-primary/40'
          : 'bg-accent-secondary/5 border-accent-secondary/20 hover:border-accent-secondary/40'
      }`}
    >
      {/* Category badge */}
      <div className={`flex items-center gap-1.5 text-xs font-mono w-fit px-2 py-0.5 rounded-full whitespace-nowrap ${
        primary
          ? 'bg-accent-primary/15 text-accent-primary'
          : 'bg-accent-secondary/15 text-accent-secondary'
      }`}>
        <span>{categoryIcon}</span>
        <span>{categoryName}</span>
      </div>

      {/* Skill name */}
      <h3 className="font-mono font-bold text-sm leading-snug">{item.name}</h3>

      {/* Level dots */}
      <LevelDots level={item.level} primary={primary} />

      {/* Years */}
      <span className={`text-xs font-mono mt-auto ${
        primary ? 'text-accent-primary/70' : 'text-accent-secondary/70'
      }`}>
        {item.years}
      </span>
    </motion.div>
  );
}

export default function SkillsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [translateAmount, setTranslateAmount] = useState(0);

  const allCards = data.skills.categories.flatMap((cat) =>
    cat.items.map((item) => ({ item, cat }))
  );
  const half = Math.ceil(allCards.length / 2);
  const row1 = allCards.slice(0, half);
  const row2 = allCards.slice(half);

  // Measure with ResizeObserver — more reliable than setTimeout
  useEffect(() => {
    if (!rowRef.current) return;

    const measure = () => {
      if (!rowRef.current) return;
      const overflow = Math.max(0, rowRef.current.offsetWidth - window.innerWidth);
      setTranslateAmount(overflow);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(rowRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // 12% buffer zones at start and end so horizontal scroll eases in/out
  // instead of snapping abruptly between vertical and horizontal
  const buffer = translateAmount > 0 ? Math.round(translateAmount * 0.12) : 0;
  const totalScrollable = translateAmount + buffer * 2;
  const startPct = totalScrollable > 0 ? buffer / totalScrollable : 0;
  const endPct = totalScrollable > 0 ? 1 - startPct : 1;
  const sectionHeight = translateAmount > 0 ? `calc(100vh + ${totalScrollable}px)` : '200vh';

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Direct transform — no spring wrapper to avoid lag/race
  const x = useTransform(
    scrollYProgress,
    [startPct, endPct],
    [0, -translateAmount],
    { clamp: true }
  );

  return (
    <section id="skills" className="scroll-mt-16">
      <div ref={containerRef} style={{ height: sectionHeight }}>
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-center">

          {/* Heading */}
          <div className="max-w-5xl mx-auto px-4 w-full mb-8">
            <motion.h1
              className="text-3xl font-bold mb-1 text-center"
              variants={fadeSlideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              Skills
            </motion.h1>
            <motion.p
              className="text-center text-fg/40 text-sm font-mono"
              variants={fadeSlideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Scroll to explore
            </motion.p>
          </div>

          {/* Two-row scroll-driven shelf */}
          <div className="overflow-visible">
            <motion.div
              ref={rowRef}
              style={{ x }}
              className="flex flex-col gap-4 px-8 md:px-16 w-max will-change-transform"
            >
              <div className="flex gap-4">
                {row1.map(({ item, cat }) => (
                  <SkillCard
                    key={`r1-${cat.name}-${item.name}`}
                    item={item}
                    categoryName={cat.name}
                    categoryIcon={cat.icon}
                    color={cat.color}
                  />
                ))}
              </div>
              <div className="flex gap-4">
                {row2.map(({ item, cat }) => (
                  <SkillCard
                    key={`r2-${cat.name}-${item.name}`}
                    item={item}
                    categoryName={cat.name}
                    categoryIcon={cat.icon}
                    color={cat.color}
                  />
                ))}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
