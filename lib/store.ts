import { create } from 'zustand';

interface UIState {
muted: boolean;
toggleMute: () => void;
theme: 'light' | 'dark';
toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
muted: typeof window !== 'undefined' ? localStorage.getItem('muted') === 'true' : false,
toggleMute: () =>
set((state) => {
const muted = !state.muted;
if (typeof window !== 'undefined') localStorage.setItem('muted', String(muted));
return { muted };
}),
theme: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
toggleTheme: () =>
set((state) => {
const newTheme = state.theme === 'light' ? 'dark' : 'light';
const root = document.documentElement;
root.classList.toggle('dark', newTheme === 'dark');
if (typeof window !== 'undefined') localStorage.setItem('theme', newTheme);
return { theme: newTheme };
})
}));