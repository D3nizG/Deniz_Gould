'use client';

import data from '../../../public/resume.json';
import { fadeSlideUp } from '../../../lib/motion.client';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
      <motion.div 
        variants={fadeSlideUp} 
        initial="hidden" 
        animate="visible" 
        className="justify-self-center"
      >
        <Image 
          src="/images/profile.jpg" 
          width={480} 
          height={480} 
          alt="Deniz Gould portrait" 
          className="rounded-full object-cover" 
        />
      </motion.div>
      
      <motion.div 
        variants={fadeSlideUp} 
        initial="hidden" 
        animate="visible" 
        transition={{ delay: 0.2 }}
        className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-6"
      >
        <h1 className="text-3xl font-bold mb-4">About Me</h1>
        <p className="leading-relaxed mb-6">
          {data.objective}
        </p>
        <div className="flex flex-wrap gap-2">
          {data.skills.interests.map((i) => (
            <span 
              key={i} 
              className="px-3 py-1 bg-accent-secondary/20 text-accent-secondary rounded-full text-sm font-mono"
            >
              {i}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}