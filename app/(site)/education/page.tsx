import type { Metadata } from 'next';
import EducationSection from '@/components/sections/EducationSection';
import { buildPageMetadata } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata(
  'Education',
  'Education history and academic focus areas for Deniz Gould.',
  '/education',
);

export default function EducationPage() {
  return <EducationSection />;
}
