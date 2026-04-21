'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronLeft, ChevronRight, Github, ExternalLink, X } from 'lucide-react';
import data from '@/public/resume.json';
import { fadeSlideUp } from '@/lib/motion.client';

type Project = (typeof data.projects)[number];

const CARD_W = 280;
const CARD_H = 380;
const PIXELS_PER_CARD = 260; // drag pixels required to advance 1 card

// ─── slot config ─────────────────────────────────────────────────────────────

interface SlotStyle {
  x: number; rotateY: number; scale: number;
  opacity: number; blur: number; zIndex: number;
  ghost: boolean; interactive: boolean;
}

function getSlotStyle(offset: number): SlotStyle {
  const abs = Math.abs(offset);
  const s = Math.sign(offset) || 1;
  if (abs === 0) return { x: 0,        rotateY: 0,       scale: 1,    opacity: 1,    blur: 0,  zIndex: 20, ghost: false, interactive: true  };
  if (abs === 1) return { x: s * 320,  rotateY: s * -50, scale: 0.9,  opacity: 0.75, blur: 2,  zIndex: 15, ghost: false, interactive: true  };
  if (abs === 2) return { x: s * 510,  rotateY: s * -82, scale: 0.8,  opacity: 0.38, blur: 5,  zIndex: 10, ghost: false, interactive: true  };
  if (abs === 3) return { x: s * 110,  rotateY: s * -22, scale: 0.72, opacity: 0.13, blur: 7,  zIndex: 4,  ghost: true,  interactive: false };
  if (abs === 4) return { x: 0,        rotateY: 0,       scale: 0.68, opacity: 0.08, blur: 9,  zIndex: 2,  ghost: true,  interactive: false };
  return               { x: 0,        rotateY: 0,       scale: 0.65, opacity: 0,    blur: 12, zIndex: 1,  ghost: true,  interactive: false };
}

// Linear interpolation between two integer slot styles for fractional offsets
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getSlotStyleFrac(offsetFrac: number): SlotStyle {
  const floor = Math.floor(offsetFrac);
  const t = offsetFrac - floor;
  if (t === 0) return getSlotStyle(floor);
  const a = getSlotStyle(floor);
  const b = getSlotStyle(floor + 1);
  return {
    x:           lerp(a.x,        b.x,        t),
    rotateY:     lerp(a.rotateY,  b.rotateY,  t),
    scale:       lerp(a.scale,    b.scale,    t),
    opacity:     lerp(a.opacity,  b.opacity,  t),
    blur:        lerp(a.blur,     b.blur,     t),
    zIndex:      t < 0.5 ? a.zIndex      : b.zIndex,
    ghost:       t < 0.5 ? a.ghost       : b.ghost,
    interactive: t < 0.5 ? a.interactive : b.interactive,
  };
}

// Circular offset: normalised to (-n/2, n/2]
function circularOffset(i: number, currentFloat: number, n: number): number {
  let off = i - currentFloat;
  while (off > n / 2)  off -= n;
  while (off <= -n / 2) off += n;
  return off;
}

// ─── single card ─────────────────────────────────────────────────────────────

function CarouselCard({
  project, slot, isDragging, onPointerDownCard,
}: {
  project: Project;
  slot: SlotStyle;
  isDragging: boolean;
  onPointerDownCard: () => void;
}) {
  const isPlaceholder = !project.summary;
  const isCenter = slot.zIndex === 20;

  return (
    <motion.div
      animate={{ x: slot.x, rotateY: slot.rotateY, scale: slot.scale, opacity: slot.opacity }}
      style={{
        position: 'absolute',
        width: CARD_W,
        height: CARD_H,
        filter: `blur(${slot.blur}px)`,
        transition: 'filter 0.3s ease',
        zIndex: slot.zIndex,
        pointerEvents: slot.interactive ? 'auto' : 'none',
        cursor: isDragging ? 'grabbing' : (slot.interactive && !isPlaceholder ? 'pointer' : 'default'),
        transformOrigin: 'center center',
      }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 28 }}
      onPointerDown={onPointerDownCard}
    >
      {slot.ghost ? (
        <div className="w-full h-full rounded-2xl border border-accent-primary/12" />
      ) : isPlaceholder ? (
        <div className="w-full h-full rounded-2xl border border-dashed border-fg/15 bg-bg/20 flex items-center justify-center">
          <span className="text-fg/20 text-sm font-mono">Coming Soon</span>
        </div>
      ) : (
        <div
          className={`w-full h-full rounded-2xl flex flex-col p-6 border transition-colors ${
            isCenter ? 'bg-bg border-accent-primary/30' : 'bg-bg/70 border-fg/10'
          }`}
          style={{
            boxShadow: isCenter
              ? '0 0 40px rgba(100,255,218,0.08), 0 20px 60px rgba(0,0,0,0.5)'
              : '0 8px 40px rgba(0,0,0,0.3)',
          }}
        >
          <h2 className="font-bold text-lg text-accent-primary leading-tight mb-2">{project.name}</h2>
          <p className="text-sm text-fg/70 leading-relaxed flex-1 line-clamp-4">{project.summary}</p>
          {project.stack.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {project.stack.slice(0, 4).map((t) => (
                <span key={t} className="px-2 py-0.5 text-xs font-mono bg-accent-primary/10 text-accent-primary/80 rounded">
                  {t}
                </span>
              ))}
              {project.stack.length > 4 && (
                <span className="px-2 py-0.5 text-xs font-mono text-fg/30">+{project.stack.length - 4}</span>
              )}
            </div>
          )}
          {isCenter && (
            <p className="text-xs text-fg/25 font-mono mt-4 text-center">tap to expand</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── modal ───────────────────────────────────────────────────────────────────

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg rounded-2xl p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-fg/10"
      >
        <div className="flex items-start justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <button onClick={onClose} className="shrink-0 p-1 text-fg/50 hover:text-fg transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="text-fg/80 leading-relaxed mb-5">{project.longDescription}</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {project.stack.map((t) => (
            <span key={t} className="px-3 py-1 text-xs bg-accent-secondary/20 rounded-full font-mono text-accent-secondary">{t}</span>
          ))}
        </div>
        {project.metrics && project.metrics.length > 0 && (
          <ul className="mb-5 flex flex-col gap-1.5">
            {project.metrics.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm text-fg/70">
                <span className="text-accent-primary mt-0.5 shrink-0">▸</span>{m}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3 mt-6">
          {project.githubUrl && (
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-4 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors">
              <Github size={15} />GitHub
            </a>
          )}
          {project.playUrl && (
            <a href={project.playUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-accent-secondary/30 bg-accent-secondary/10 px-4 py-2 text-sm font-medium text-accent-secondary hover:bg-accent-secondary/20 transition-colors">
              <ExternalLink size={15} />Live Demo
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function ProjectsSection() {
  const projects = data.projects;
  const n = projects.length;

  const [current, setCurrent] = useState(0);
  const [dragShift, setDragShift] = useState(0);   // fractional card offset during drag
  const [isDragging, setIsDragging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const headingInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const keyboardInView = useInView(sectionRef, { margin: '-30% 0px' });

  // Pointer tracking refs (no re-render)
  const startX = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocityX = useRef(0);  // px/s
  const didDragRef = useRef(false);

  // Track which card received pointerdown — needed because setPointerCapture
  // redirects pointerup to the container, so card onClick never fires.
  // Cards set this ref on their own onPointerDown (fires before container's handler).
  const clickedCardIndex = useRef<number | null>(null);

  const navigate = useCallback((dir: 1 | -1) => {
    setCurrent((c) => ((c + dir) % n + n) % n);
  }, [n]);

  // Keyboard navigation
  useEffect(() => {
    if (!keyboardInView || modalOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1);  }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [keyboardInView, modalOpen, navigate]);

  // ── pointer handlers ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (modalOpen) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    lastX.current  = e.clientX;
    lastT.current  = e.timeStamp;
    velocityX.current = 0;
    didDragRef.current = false;
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;

    // Track instantaneous velocity
    const dt = e.timeStamp - lastT.current;
    if (dt > 0) velocityX.current = ((e.clientX - lastX.current) / dt) * 1000;
    lastX.current = e.clientX;
    lastT.current = e.timeStamp;

    if (Math.abs(dx) > 4) didDragRef.current = true;
    setDragShift(-dx / PIXELS_PER_CARD);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (didDragRef.current) {
      // Drag with momentum snap
      const momentumCards = -(velocityX.current / 500);
      const total = dragShift + momentumCards;
      const delta = Math.round(total);
      const clamped = Math.max(-4, Math.min(4, delta));
      setCurrent((c) => ((c + clamped) % n + n) % n);
    } else {
      // Pure click — handle navigation or modal open.
      // We use clickedCardIndex because setPointerCapture causes pointerup to fire
      // on the container (not the card), so card onClick never fires.
      const clicked = clickedCardIndex.current;
      if (clicked !== null) {
        if (clicked === current) {
          // Center card clicked — open modal if it's a real project
          if (projects[current].summary) setModalOpen(true);
        } else {
          // Non-center card clicked — navigate if slot is interactive
          const offset = Math.round(circularOffset(clicked, current, n));
          const slot = getSlotStyle(offset);
          if (slot.interactive) setCurrent(clicked);
        }
      }
    }

    setDragShift(0);
    clickedCardIndex.current = null;
  };

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="py-16 min-h-screen scroll-mt-24 flex flex-col items-center justify-center"
    >
      {/* Heading */}
      <motion.h1
        className="text-3xl font-bold mb-2 text-center"
        variants={fadeSlideUp} initial="hidden"
        animate={headingInView ? 'visible' : 'hidden'}
      >
        Projects
      </motion.h1>
      <motion.p
        className="text-fg/40 text-sm font-mono mb-14 text-center select-none"
        variants={fadeSlideUp} initial="hidden"
        animate={headingInView ? 'visible' : 'hidden'}
        transition={{ delay: 0.1 }}
      >
        drag · ← → · click to expand
      </motion.p>

      {/* Stage */}
      <div className="relative w-full flex items-center justify-center">
        {/* Left arrow */}
        <button onClick={() => navigate(-1)}
          className="absolute left-4 md:left-8 z-30 flex items-center justify-center w-10 h-10 rounded-full border border-fg/20 text-fg/60 hover:text-accent-primary hover:border-accent-primary/40 bg-bg/80 backdrop-blur-sm transition-colors"
          aria-label="Previous project">
          <ChevronLeft size={20} />
        </button>

        {/* 3D stage — drag target */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: '100%', height: CARD_H + 80, perspective: '1200px',
                   cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {projects.map((project, i) => {
            const rawOffset = circularOffset(i, current + dragShift, n);
            const computedSlot = isDragging
              ? getSlotStyleFrac(rawOffset)
              : getSlotStyle(circularOffset(i, current, n));
            return (
              <CarouselCard
                key={i}
                project={project}
                slot={computedSlot}
                isDragging={didDragRef.current && isDragging}
                onPointerDownCard={() => { clickedCardIndex.current = i; }}
              />
            );
          })}
        </div>

        {/* Right arrow */}
        <button onClick={() => navigate(1)}
          className="absolute right-4 md:right-8 z-30 flex items-center justify-center w-10 h-10 rounded-full border border-fg/20 text-fg/60 hover:text-accent-primary hover:border-accent-primary/40 bg-bg/80 backdrop-blur-sm transition-colors"
          aria-label="Next project">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mt-10">
        {projects.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to project ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-4 bg-accent-primary' : 'w-1.5 bg-fg/25 hover:bg-fg/50'
            }`}
          />
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ProjectModal project={projects[current]} onClose={() => setModalOpen(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
