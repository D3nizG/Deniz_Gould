import type { Metadata } from 'next';
import AboutSection from '@/components/sections/AboutSection';
import { buildPageMetadata } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata(
  'About',
  'Background, focus areas, and interests for Deniz Gould, an AI/ML-focused software engineer.',
  '/about',
);

export default function AboutPage() {
  return <AboutSection />;
}
