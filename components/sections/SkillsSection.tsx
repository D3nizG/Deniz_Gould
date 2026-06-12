'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';
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
type SkillCardData = {
  item: SkillItem;
  cat: {
    name: string;
    icon: string;
    color: string;
  };
};

function SkillCard({ item, categoryName, categoryIcon, color, onPause, onResume }: {
  item: SkillItem;
  categoryName: string;
  categoryIcon: string;
  color: string;
  onPause: () => void;
  onResume: () => void;
}) {
  const primary = isPrimary(color);
  return (
    <motion.div
      tabIndex={0}
      onPointerEnter={onPause}
      onPointerLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      whileHover={{
        y: -5,
        boxShadow: primary
          ? '0 8px 28px rgba(100,255,218,0.12)'
          : '0 8px 28px rgba(255,184,107,0.12)',
      }}
      className={`shrink-0 w-60 h-40 select-none flex flex-col gap-2.5 p-4 rounded-xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
        primary
          ? 'bg-accent-primary/5 border-accent-primary/20 hover:border-accent-primary/40'
          : 'bg-accent-secondary/5 border-accent-secondary/20 hover:border-accent-secondary/40'
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-mono w-fit px-2 py-0.5 rounded-full whitespace-nowrap ${
        primary
          ? 'bg-accent-primary/15 text-accent-primary'
          : 'bg-accent-secondary/15 text-accent-secondary'
      }`}>
        <span>{categoryIcon}</span>
        <span>{categoryName}</span>
      </div>

      <h3 className="font-mono font-bold text-sm leading-snug">{item.name}</h3>

      <LevelDots level={item.level} primary={primary} />

      <span className={`text-xs font-mono mt-auto ${
        primary ? 'text-accent-primary/70' : 'text-accent-secondary/70'
      }`}>
        {item.years}
      </span>
    </motion.div>
  );
}

const AUTO_SCROLL_PX_PER_SECOND = 38;
const MOMENTUM_FRICTION = 0.94;
const MIN_MOMENTUM = 8;

function chunkCards(cards: SkillCardData[], size: number) {
  const chunks: SkillCardData[][] = [];
  for (let i = 0; i < cards.length; i += size) {
    chunks.push(cards.slice(i, i + size));
  }
  return chunks;
}

export default function SkillsSection() {
  const loopRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [loopWidth, setLoopWidth] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);

  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const lastPointerX = useRef(0);
  const lastPointerT = useRef(0);
  const dragVelocity = useRef(0);
  const momentumVelocity = useRef(0);
  const isDragging = useRef(false);

  const allCards = data.skills.categories.flatMap((cat) =>
    cat.items.map((item) => ({ item, cat }))
  );
  const cardColumns = useMemo(() => chunkCards(allCards, 2), [allCards]);

  const wrapOffset = useCallback((value: number) => {
    if (!loopWidth) return value;
    let next = value;
    while (next <= -loopWidth) next += loopWidth;
    while (next > 0) next -= loopWidth;
    return next;
  }, [loopWidth]);

  useEffect(() => {
    const node = loopRef.current;
    if (!node) return;

    const measure = () => setLoopWidth(node.scrollWidth);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useAnimationFrame((_, delta) => {
    if (!loopWidth || isDragging.current || isHoverPaused) return;

    const seconds = delta / 1000;
    let velocity = -AUTO_SCROLL_PX_PER_SECOND;

    if (Math.abs(momentumVelocity.current) > MIN_MOMENTUM) {
      velocity = momentumVelocity.current;
      momentumVelocity.current *= MOMENTUM_FRICTION;
    } else {
      momentumVelocity.current = 0;
    }

    x.set(wrapOffset(x.get() + velocity * seconds));
  });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isDragging.current = true;
    momentumVelocity.current = 0;
    dragVelocity.current = 0;
    dragStartX.current = event.clientX;
    dragStartOffset.current = x.get();
    lastPointerX.current = event.clientX;
    lastPointerT.current = event.timeStamp;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const dx = event.clientX - dragStartX.current;
    x.set(wrapOffset(dragStartOffset.current + dx));

    const dt = event.timeStamp - lastPointerT.current;
    if (dt > 0) {
      dragVelocity.current = ((event.clientX - lastPointerX.current) / dt) * 1000;
    }
    lastPointerX.current = event.clientX;
    lastPointerT.current = event.timeStamp;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    momentumVelocity.current = dragVelocity.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const pause = useCallback(() => setIsHoverPaused(true), []);
  const resume = useCallback(() => setIsHoverPaused(false), []);

  const renderColumns = (prefix: string) => cardColumns.map((column, columnIndex) => (
    <div key={`${prefix}-${columnIndex}`} className="flex shrink-0 flex-col gap-4">
      {column.map(({ item, cat }) => (
        <SkillCard
          key={`${prefix}-${cat.name}-${item.name}`}
          item={item}
          categoryName={cat.name}
          categoryIcon={cat.icon}
          color={cat.color}
          onPause={pause}
          onResume={resume}
        />
      ))}
    </div>
  ));

  return (
    <section id="skills" className="section-wash section-wash-skills scroll-mt-16 overflow-hidden py-20">
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
          drag the shelf
        </motion.p>
      </div>

      <div
        ref={trackRef}
        className="w-full cursor-grab select-none overflow-hidden active:cursor-grabbing"
        style={{ touchAction: 'pan-y', userSelect: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <motion.div
          style={{ x }}
          className="flex w-max select-none gap-4 will-change-transform"
          aria-label="Auto-scrolling skills carousel"
        >
          <div ref={loopRef} className="flex gap-4 px-2">
            {renderColumns('a')}
          </div>
          <div className="flex gap-4 px-2">
            {renderColumns('b')}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
