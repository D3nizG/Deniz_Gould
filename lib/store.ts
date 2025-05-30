import { create } from 'zustand';

interface UIState {
  muted: boolean;
  toggleMute: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Helper function to get initial theme
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark'; // Default for SSR
  
  // Check localStorage first
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useUIStore = create<UIState>((set) => ({
  muted: typeof window !== 'undefined' ? localStorage.getItem('muted') === 'true' : false,
  toggleMute: () =>
    set((state) => {
      const muted = !state.muted;
      if (typeof window !== 'undefined') localStorage.setItem('muted', String(muted));
      return { muted };
    }),
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        root.classList.toggle('dark', newTheme === 'dark');
        localStorage.setItem('theme', newTheme);
      }
      return { theme: newTheme };
    })
}));