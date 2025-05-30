'use client';

import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/lib/store';

export default function ThemeToggle() {
const { theme, toggleTheme } = useUIStore();
return (
<button aria-label="Toggle theme" className="p-2 rounded-full hover:bg-accent-primary/20 transition" onClick={toggleTheme} >
{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
</button>
);
}