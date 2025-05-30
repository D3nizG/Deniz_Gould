/* app/layout.tsx */
import '../styles/globals.css';
import type { ReactNode } from 'react';
import { Inter, Fira_Code } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const fira  = Fira_Code({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'Deniz Gould - AI/ML Engineer',
  description: 'Interactive portfolio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fira.variable}`}>
      <body className="bg-bg text-fg">{children}</body>
    </html>
  );
}
