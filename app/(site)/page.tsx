'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { fadeSlideUp } from '../../lib/motion.client';
import data from '../../public/resume.json';
import { Linkedin, Github, Twitter, Instagram, Mail, Play, Bot, User } from 'lucide-react';
import { useState } from 'react';

const Game = dynamic(() => import('../../components/Game/MsPacMan'), { ssr: false, loading: () => null });

export default function HomePage() {
  const [isAIMode, setIsAIMode] = useState(true);

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
    <section className="flex flex-col items-center justify-center gap-8 text-center min-h-[calc(100vh-4rem)]">
      {/* Header Content - Moved up more with reduced top padding */}
      <motion.div
        className="flex flex-col items-center gap-4 -mt-16"
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
        className="flex flex-col items-center gap-4"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        {/* Game Container */}
        <motion.div
          className="relative w-full max-w-xl aspect-square bg-black rounded-2xl overflow-hidden"
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          <Game />
          <div className="absolute inset-0 pointer-events-none animate-pulse opacity-10">
            {/* subtle background particles placeholder */}
            <Image src="/images/particles.svg" alt="" fill />
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
          {/* Play Button */}
          <button
            className="flex items-center gap-2 px-6 py-3 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/30 rounded-lg transition-all duration-300 hover:scale-105 font-medium"
            onClick={() => {
              // TODO: Add play functionality when game is implemented
              console.log('Play button clicked');
            }}
          >
            <Play size={18} />
            Play
          </button>

          {/* AI/Manual Toggle */}
          <button
            className={`flex items-center gap-2 px-6 py-3 border rounded-lg transition-all duration-300 hover:scale-105 font-medium ${
              isAIMode
                ? 'bg-accent-secondary/20 hover:bg-accent-secondary/30 border-accent-secondary/30 text-accent-secondary'
                : 'bg-accent-primary/20 hover:bg-accent-primary/30 border-accent-primary/30 text-accent-primary'
            }`}
            onClick={() => {
              setIsAIMode(!isAIMode);
              // TODO: Add toggle functionality when game is implemented
              console.log(`Switched to ${!isAIMode ? 'AI' : 'Manual'} mode`);
            }}
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
  );
}