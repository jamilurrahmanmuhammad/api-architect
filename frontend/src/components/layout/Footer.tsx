/**
 * T041: GREEN - Footer component.
 */

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`border-t bg-muted/40 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Logo placeholder (FR-011) */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <span className="text-xs font-bold">AA</span>
            </div>
            <span className="text-sm font-medium">API Architect</span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} API Architect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
