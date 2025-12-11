/**
 * T040/T075: GREEN - Header component for public pages.
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header
      className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo placeholder (FR-011) */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">AA</span>
          </div>
          <span className="text-xl font-semibold">API Architect</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
