'use client';

import data from '@/public/resume.json';
import { motion } from 'framer-motion';
import { fadeSlideUp } from '@/lib/motion.client';

export default function EducationPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      <motion.h1 
        className="text-3xl font-bold mb-8 text-center"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
      >
        Education
      </motion.h1>
      
      <div className="space-y-6">
        {data.education.map((e, index) => (
          <motion.div
            key={e.degree}
            className="bg-accent-primary/5 rounded-lg p-6 border border-accent-primary/20"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
          >
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-fg mb-1">{e.degree}</h3>
              <p className="text-accent-primary font-medium mb-1">{e.school}</p>
              <span className="text-sm text-accent-secondary font-mono">
                {'year' in e ? e.year : e.years}
              </span>
            </div>

            {/* Focus area */}
            {e.focus && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-accent-secondary mb-2">Focus Area</h4>
                <p className="text-sm text-fg/80 pl-4 border-l-2 border-accent-primary/30">{e.focus}</p>
              </div>
            )}

            {/* Coursework */}
            {e.coursework && e.coursework.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-accent-secondary mb-3">Relevant Coursework</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {e.coursework.map((course, courseIndex) => (
                    <div 
                      key={courseIndex}
                      className="flex items-center text-sm text-fg/80"
                    >
                      <div className="w-2 h-2 bg-accent-primary rounded-full mr-3 flex-shrink-0"></div>
                      {course}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}