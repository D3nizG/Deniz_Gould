'use client';

import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Only render after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a placeholder during SSR/hydration
  if (!mounted) {
    return (
      <button 
        aria-label="Toggle theme" 
        className="p-2 rounded-full hover:bg-accent-primary/20 transition opacity-50"
      >
        <div className="w-[18px] h-[18px]" /> {/* Placeholder to maintain layout */}
      </button>
    );
  }

  return (
    <button 
      aria-label="Toggle theme" 
      className="p-2 rounded-full hover:bg-accent-primary/20 transition" 
      onClick={toggleTheme}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}