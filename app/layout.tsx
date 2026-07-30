import type { Metadata, Viewport } from 'next';
import './globals.css';

// No web fonts: the UI uses the Apple system stack (-apple-system renders SF Pro
// on Apple platforms, the native UI font elsewhere). SF Pro is not licensed for
// web self-hosting, so this is the authentic, zero-request approach.

export const metadata: Metadata = {
  title: 'DevPulse · Personal Feed',
  description:
    'A lightweight personal feed aggregator for developers: Hacker News, Reddit, GitHub trending, free game deals, and arXiv research papers in one page.'
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9ebf2' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply the saved (or system) theme before first paint to avoid a flash.
  const themeScript = `(function(){try{var t=localStorage.getItem('devpulse-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* SVG displacement filter powering the Liquid Glass refraction (referenced
            from CSS as url(#glass-distortion)). Visually hidden, present once. */}
        <svg
          aria-hidden="true"
          focusable="false"
          style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
        >
          <defs>
            <filter id="glass-distortion" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves={2} seed={7} result="noise" />
              <feGaussianBlur in="noise" stdDeviation="1.4" result="soft" />
              <feDisplacementMap in="SourceGraphic" in2="soft" scale="52" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
