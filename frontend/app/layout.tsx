import './globals.css';
import { Header } from '@/components/Header';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Change Intelligence',
  description: 'Docs-first product shell for change impact intelligence.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
