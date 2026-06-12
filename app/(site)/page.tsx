'use client';

import { motion } from 'framer-motion';
import { BrainCircuit, Code2, Github, Instagram, Linkedin, Mail, Rocket, Twitter } from 'lucide-react';
import data from '../../public/resume.json';
import { fadeSlideLeft, scaleIn, staggerContainer } from '../../lib/motion.client';
import AboutSection from '@/components/sections/AboutSection';
import SkillsSection from '@/components/sections/SkillsSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import EducationSection from '@/components/sections/EducationSection';
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

            <motion.div variants={fadeSlideLeft} className="flex flex-wrap gap-2 pt-1">
              {['AI/ML', 'Full-stack', 'Realtime systems'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-fg/10 px-3 py-1 text-xs font-mono text-fg/55"
                >
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column — portfolio signal */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="relative min-h-[420px] overflow-hidden rounded-2xl border border-fg/10 bg-bg-secondary/50 p-6 shadow-2xl shadow-black/20"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary" />
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-accent-primary">
                  <BrainCircuit size={26} />
                  <span className="font-mono text-xs uppercase tracking-[0.28em] text-fg/50">
                    Engineering Focus
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold leading-tight">
                    Intelligent products with practical systems underneath.
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-fg/65">
                    I build AI-assisted applications, realtime web experiences, and backend services
                    that stay understandable from prototype through production.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <Code2 size={18} />, value: '5+', label: 'years web' },
                  { icon: <BrainCircuit size={18} />, value: 'AI', label: 'focused MS' },
                  { icon: <Rocket size={18} />, value: '3', label: 'live projects' },
                ].map((item) => (
                  <div key={item.label} className="border-l border-fg/15 pl-3">
                    <div className="mb-2 text-accent-secondary">{item.icon}</div>
                    <div className="font-mono text-xl font-bold text-fg">{item.value}</div>
                    <div className="text-xs text-fg/45">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-accent-primary/15 bg-black/25 p-4 font-mono text-xs leading-relaxed text-fg/70">
                <div className="mb-2 text-accent-primary">current_stack.ts</div>
                <div>
                  <span className="text-accent-secondary">const</span> focus = [
                  <span className="text-fg">'LLMs'</span>, <span className="text-fg">'React'</span>,{' '}
                  <span className="text-fg">'Realtime APIs'</span>];
                </div>
              </div>
            </div>
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
