import type { Metadata } from 'next';
import resumeData from '@/public/resume.json';

const sameAs = [
  `https://${resumeData.linkedin}`,
  `https://${resumeData.github}`,
  `https://${resumeData.X}`,
  `https://${resumeData.instagram}`,
];

export const siteConfig = {
  name: resumeData.name,
  url: 'https://d3nizg.dev',
  title: `${resumeData.name} | ${resumeData.title}`,
  description:
    'Portfolio site for Deniz Gould, featuring AI/ML-focused software engineering work, interactive experiments, and project highlights.',
  location: resumeData.location,
  email: resumeData.email,
  socialHandles: {
    twitter: '@D3n1z_G',
  },
  sameAs,
} as const;

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString();
}

export function buildPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [
        {
          url: absoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} portfolio preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      creator: siteConfig.socialHandles.twitter,
      images: [absoluteUrl('/opengraph-image')],
    },
  };
}

export const personStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteConfig.name,
  url: siteConfig.url,
  jobTitle: resumeData.title,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'San Francisco',
    addressRegion: 'CA',
  },
  email: `mailto:${siteConfig.email}`,
  sameAs: siteConfig.sameAs,
  knowsAbout: [
    'Artificial intelligence',
    'Machine learning',
    'Software engineering',
    'Interactive web applications',
    'Game AI',
  ],
};
