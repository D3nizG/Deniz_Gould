'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';

export function ThemeInitializer() {
  const { theme } = useUIStore();

  useEffect(() => {
    // Apply the current theme to DOM immediately
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}