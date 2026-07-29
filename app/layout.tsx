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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
