'use client';

import { useRef, useState } from 'react';
import data from '@/public/resume.json';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeSlideUp, fadeSlideRight, scaleIn, staggerContainer } from '@/lib/motion.client';

type EducationEntry = (typeof data.education)[number];

function getYear(e: EducationEntry): string {
  return 'year' in e
    ? (e as EducationEntry & { year: string }).year
    : (e as EducationEntry & { years: string }).years;
}

function EducationCard({ entry }: { entry: EducationEntry }) {
  const [showCourses, setShowCourses] = useState(false);
  const hasCourses = entry.coursework && entry.coursework.length > 0;

  return (
    <motion.div
      variants={fadeSlideRight}
      className="flex-1 pb-8"
    >
      <div className="bg-accent-primary/5 rounded-xl p-6 border border-accent-primary/20 hover:border-accent-primary/40 transition-colors">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-fg leading-snug mb-1">{entry.degree}</h3>
            <p className="text-accent-primary font-medium text-sm">{entry.school}</p>
          </div>
          <span className="shrink-0 px-3 py-1 text-xs font-mono bg-accent-secondary/20 text-accent-secondary rounded-full">
            {getYear(entry)}
          </span>
        </div>

        {/* Focus area */}
        {entry.focus && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-accent-secondary uppercase tracking-wider mb-2">
              Focus
            </h4>
            <p className="text-sm text-fg/70 pl-3 border-l-2 border-accent-primary/30">
              {entry.focus}
            </p>
          </div>
        )}

        {/* Coursework toggle */}
        {hasCourses && (
          <>
            <button
              onClick={() => setShowCourses((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-mono text-fg/50 hover:text-accent-primary transition-colors mt-1"
              aria-expanded={showCourses}
            >
              <motion.span
                animate={{ rotate: showCourses ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronDown size={14} />
              </motion.span>
              {showCourses ? 'Hide' : 'Show'} coursework
            </button>

            <AnimatePresence initial={false}>
              {showCourses && (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-accent-primary/10">
                    {entry.coursework!.map((course, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-fg/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 shrink-0" />
                        {course}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function EducationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      id="education"
      className="max-w-3xl mx-auto px-4 py-16 min-h-screen scroll-mt-24"
    >
      <motion.h1
        className="text-3xl font-bold mb-12 text-center"
        variants={fadeSlideUp}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        Education
      </motion.h1>

      {/* Timeline entries */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {data.education.map((entry, index) => (
          <div key={entry.degree} className="flex gap-5">
            {/* Timeline column: dot + connecting line */}
            <div className="flex flex-col items-center shrink-0">
              <motion.div
                variants={scaleIn}
                className="w-3 h-3 rounded-full bg-accent-primary mt-7 shrink-0 border-2 border-bg ring-2 ring-accent-primary/20"
              />
              {index < data.education.length - 1 && (
                <div className="w-px flex-1 bg-accent-primary/20 mt-1" />
              )}
            </div>

            {/* Card */}
            <EducationCard entry={entry} />
          </div>
        ))}
      </motion.div>
    </section>
  );
}
