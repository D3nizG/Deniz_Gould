import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle at top left, rgba(100,255,218,0.28), transparent 34%), radial-gradient(circle at bottom right, rgba(255,184,107,0.26), transparent 30%), linear-gradient(135deg, #0d1117 0%, #152238 100%)',
          color: '#f0f6fc',
          fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '56px 64px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: 28,
              background: 'rgba(100,255,218,0.12)',
              border: '1px solid rgba(100,255,218,0.3)',
              color: '#64ffda',
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            DG
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxWidth: 820,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 66,
                fontWeight: 700,
                lineHeight: 1.05,
              }}
            >
              {siteConfig.name}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                color: '#ffb86b',
                letterSpacing: 1,
              }}
            >
              AI/ML-focused software engineer
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                lineHeight: 1.35,
                color: 'rgba(240,246,252,0.82)',
              }}
            >
              Building intelligent web apps, interactive game experiments, and machine-learning
              driven product experiences.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 22,
              color: 'rgba(240,246,252,0.72)',
            }}
          >
            <div style={{ display: 'flex' }}>{siteConfig.url.replace('https://', '')}</div>
            <div style={{ display: 'flex', color: '#64ffda' }}>Portfolio</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
