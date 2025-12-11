/**
 * T039: GREEN - PublicLayout component for unauthenticated pages.
 */

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
