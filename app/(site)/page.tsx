'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { fadeSlideUp } from '../../lib/motion.client';
import data from '../../public/resume.json';
import { Linkedin, Github, Twitter, Instagram, Mail, Play, Bot, User } from 'lucide-react';
import { useState } from 'react';
import AboutSection from '@/components/sections/AboutSection';
import SkillsSection from '@/components/sections/SkillsSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import EducationSection from '@/components/sections/EducationSection';
import { personStructuredData } from '@/lib/site';

const MsPacmanCanvas = dynamic(() => import('../../src/components/MsPacmanCanvas'), { ssr: false, loading: () => null });

export default function HomePage() {
  const [isAIMode, setIsAIMode] = useState(true);
  const [gameKey, setGameKey] = useState(0);

  const socialLinks = [
    {
      icon: <Linkedin size={24} />,
      href: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`,
      label: 'LinkedIn'
    },
    {
      icon: <Github size={24} />,
      href: data.github.startsWith('http') ? data.github : `https://${data.github}`,
      label: 'GitHub'
    },
    {
      icon: <Twitter size={24} />,
      href: data.X.startsWith('http') ? data.X : `https://${data.X}`,
      label: 'X'
    },
    {
      icon: <Instagram size={24} />,
      href: data.instagram.startsWith('http') ? data.instagram : `https://${data.instagram}`,
      label: 'Instagram'
    },
    {
      icon: <Mail size={24} />,
      href: `mailto:${data.email}`,
      label: 'Email'
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personStructuredData) }}
      />
      <section
        id="home"
        className="flex flex-col items-center justify-center gap-4 text-center min-h-screen py-16 scroll-mt-24"
      >
      {/* Header Content - Moved up more with reduced top padding */}
      <motion.div
        className="flex flex-col items-center gap-3 -mt-8"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
      >
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

        {/* Social Media Icons */}
        <motion.div
          className="flex items-center gap-6 mt-4"
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          {socialLinks.map((social, index) => (
            <motion.a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:text-accent-secondary transition-colors duration-300 hover:scale-110"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              aria-label={social.label}
            >
              {social.icon}
            </motion.a>
          ))}
        </motion.div>
      </motion.div>

      {/* Game Section */}
      <motion.div
        className="flex flex-col items-center gap-2"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        {/* Game Container */}
        <motion.div
          className="relative w-full max-w-xl bg-black rounded-2xl overflow-hidden py-[30%] px-0"
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          <div className="w-full aspect-square ">
            <MsPacmanCanvas key={gameKey} mode={isAIMode ? 'ai' : 'manual'} />
          </div>
        </motion.div>

        {/* Game Controls */}
        <motion.div
          className="flex items-center gap-4"
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
        >
          {/* Reset / Play Button */}
          <button
            className="flex items-center gap-2 px-6 py-3 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/30 rounded-lg transition-all duration-300 hover:scale-105 font-medium"
            onClick={() => setGameKey(k => k + 1)}
          >
            <Play size={18} />
            {`Play${gameKey > 0 ? ' Again' : ''}`}
          </button>

          {/* AI/Manual Toggle */}
          <button
            className={`flex items-center gap-2 px-6 py-3 border rounded-lg transition-all duration-300 hover:scale-105 font-medium ${
              isAIMode
                ? 'bg-accent-secondary/20 hover:bg-accent-secondary/30 border-accent-secondary/30 text-accent-secondary'
                : 'bg-accent-primary/20 hover:bg-accent-primary/30 border-accent-primary/30 text-accent-primary'
            }`}
            onClick={() => setIsAIMode(!isAIMode)}
          >
            {isAIMode ? (
              <>
                <Bot size={18} />
                AI Self Play
              </>
            ) : (
              <>
                <User size={18} />
                Manual Input
              </>
            )}
          </button>
        </motion.div>

        {/* Mode Description */}
        <motion.p
          className="text-sm text-fg/60 max-w-md"
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.8 }}
        >
          {isAIMode 
            ? "Watch AI navigate the maze using machine learning algorithms"
            : "Take control and play the classic game yourself"
          }
        </motion.p>
      </motion.div>
      </section>

      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <EducationSection />
    </>
  );
}
