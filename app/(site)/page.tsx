'use client';

import { motion } from 'framer-motion';
import { Linkedin, Github, Twitter, Instagram, Mail } from 'lucide-react';
import data from '../../public/resume.json';
import { fadeSlideLeft, scaleIn, staggerContainer } from '../../lib/motion.client';
import AboutSection from '@/components/sections/AboutSection';
import SkillsSection from '@/components/sections/SkillsSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import EducationSection from '@/components/sections/EducationSection';
import GameBezel from '@/components/GameBezel';
import { personStructuredData } from '@/lib/site';

const socialLinks = [
  {
    icon: <Linkedin size={22} />,
    href: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`,
    label: 'LinkedIn',
  },
  {
    icon: <Github size={22} />,
    href: data.github.startsWith('http') ? data.github : `https://${data.github}`,
    label: 'GitHub',
  },
  {
    icon: <Twitter size={22} />,
    href: data.X.startsWith('http') ? data.X : `https://${data.X}`,
    label: 'X',
  },
  {
    icon: <Instagram size={22} />,
    href: data.instagram.startsWith('http') ? data.instagram : `https://${data.instagram}`,
    label: 'Instagram',
  },
  {
    icon: <Mail size={22} />,
    href: `mailto:${data.email}`,
    label: 'Email',
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personStructuredData) }}
      />

      <section
        id="home"
        className="min-h-screen scroll-mt-16 flex items-center"
      >
        <div className="max-w-6xl mx-auto w-full px-4 py-16 grid md:grid-cols-2 gap-12 items-center">

          {/* Left column — text */}
          <motion.div
            className="flex flex-col gap-6"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeSlideLeft} className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {data.name}
              </h1>
              <h2 className="text-lg md:text-xl text-accent-secondary font-mono">
                {data.title}
              </h2>
            </motion.div>

            <motion.p
              variants={fadeSlideLeft}
              className="text-base md:text-lg text-fg/70 leading-relaxed max-w-md"
            >
              {(data as { tagline?: string }).tagline ?? data.objective.split(';')[0]}
            </motion.p>

            {/* Social icons */}
            <motion.div variants={fadeSlideLeft} className="flex items-center gap-5">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-accent-primary hover:text-accent-secondary transition-colors duration-300"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {social.icon}
                </motion.a>
              ))}
            </motion.div>

            {/* AI mode caption */}
            <motion.p
              variants={fadeSlideLeft}
              className="text-xs text-fg/40 font-mono max-w-xs"
            >
              Watch an RL agent I trained play Ms. Pac-Man in real time →
            </motion.p>
          </motion.div>

          {/* Right column — game bezel */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <GameBezel />
          </motion.div>
        </div>
      </section>

      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <EducationSection />
    </>
  );
}
