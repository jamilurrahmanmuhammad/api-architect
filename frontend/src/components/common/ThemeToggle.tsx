/**
 * Theme toggle component.
 * T074: GREEN - ThemeToggle component.
 */

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const toggle = useThemeStore((state) => state.toggle);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-5 w-5" data-testid="moon-icon" />
      ) : (
        <Sun className="h-5 w-5" data-testid="sun-icon" />
      )}
    </Button>
  );
}
