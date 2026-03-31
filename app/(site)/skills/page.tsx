import type { Metadata } from 'next';
import SkillsSection from '@/components/sections/SkillsSection';
import { buildPageMetadata } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata(
  'Skills',
  'Technical strengths across AI/ML, web development, data, and tooling.',
  '/skills',
);

export default function SkillsPage() {
  return <SkillsSection />;
}
