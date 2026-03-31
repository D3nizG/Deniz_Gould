import type { Metadata } from 'next';
import ProjectsSection from '@/components/sections/ProjectsSection';
import { buildPageMetadata } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata(
  'Projects',
  'Selected software engineering and AI/ML projects built by Deniz Gould.',
  '/projects',
);

export default function ProjectsPage() {
  return <ProjectsSection />;
}
