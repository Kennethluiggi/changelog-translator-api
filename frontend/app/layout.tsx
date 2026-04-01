import './globals.css';
import { Header } from '@/components/Header';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Manrope } from 'next/font/google';

export const metadata = {
  title: 'Opsentry',
  icons: {
    icon: '/images/opsentry_icon_512.png',
    shortcut: '/images/opsentry_icon_512.png',
    apple: '/images/opsentry_icon_512.png',
  },
};
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-opsentry',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <div className="shell">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
