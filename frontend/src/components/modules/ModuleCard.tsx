/**
 * Module card component.
 * T082, T085: GREEN - ModuleCard with Lucide icons.
 */

import { Link } from 'react-router-dom';
import {
  FileCode,
  Database,
  Cpu,
  BookOpen,
  FlaskConical,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Module } from '@/types/module';

// Icon mapping from string to component
const iconMap: Record<string, LucideIcon> = {
  FileCode,
  Database,
  Cpu,
  BookOpen,
  FlaskConical,
  Rocket,
};

interface ModuleCardProps {
  module: Module;
  className?: string;
}

export function ModuleCard({ module, className }: ModuleCardProps) {
  const Icon = iconMap[module.icon] || FileCode;
  const isDisabled = !module.enabled;

  const cardContent = (
    <Card
      data-testid="module-card"
      data-disabled={isDisabled || undefined}
      className={cn(
        'h-full transition-colors',
        isDisabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:bg-accent cursor-pointer',
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-lg p-2',
              isDisabled ? 'bg-muted' : 'bg-primary/10'
            )}
          >
            <Icon
              data-testid="module-icon"
              className={cn(
                'h-5 w-5',
                isDisabled ? 'text-muted-foreground' : 'text-primary'
              )}
            />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {module.name}
              {module.badge && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    isDisabled
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {module.badge}
                </span>
              )}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="mt-2">{module.description}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (isDisabled) {
    return cardContent;
  }

  return (
    <Link to={module.route} aria-label={`Open ${module.name} module`}>
      {cardContent}
    </Link>
  );
}
