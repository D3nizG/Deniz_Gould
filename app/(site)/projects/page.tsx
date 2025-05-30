'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import data from '@/public/resume.json';
import { playNote } from '@/lib/audio';

export default function ProjectsPage() {
const [selected, setSelected] = useState<number | null>(null);
return (
<section className="max-w-5xl mx-auto px-4 py-12">
<h1 className="text-3xl font-bold mb-8 text-center">Projects</h1>
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
{data.projects.map((project, i) => (
<motion.div
key={project.name}
whileHover={{ y: -4 }}
className="bg-white/5 p-6 rounded-xl cursor-pointer"
onClick={() => {
playNote();
setSelected(i);
}}
>
<h2 className="font-semibold text-accent-primary">{project.name}</h2>
<p className="text-sm opacity-80 mt-2">{project.summary}</p>
</motion.div>
))}
</div>

  <AnimatePresence>
    {selected !== null && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50"
        onClick={() => setSelected(null)}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bg rounded-2xl p-8 max-w-lg w-full"
        >
          <h2 className="text-2xl font-bold mb-4">{data.projects[selected].name}</h2>
          <p className="mb-4">{data.projects[selected].summary}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {data.projects[selected].stack.map((t) => (
              <span
                key={t}
                className="px-3 py-1 text-xs bg-accent-secondary/20 rounded-full font-mono text-accent-secondary"
              >
                {t}
              </span>
            ))}
          </div>
          <button
            className="ml-auto block px-4 py-2 bg-accent-primary/20 rounded hover:bg-accent-primary/30 transition"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
</section>

);
}