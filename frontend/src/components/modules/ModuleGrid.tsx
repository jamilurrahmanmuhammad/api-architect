/**
 * Module grid component.
 * T083: GREEN - ModuleGrid component.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader } from '@/components/ui/card';
import { ModuleCard } from './ModuleCard';
import type { Module } from '@/types/module';

interface ModuleGridProps {
  modules: Module[];
  showDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function ModuleGrid({
  modules,
  showDisabled = true,
  isLoading = false,
  className,
}: ModuleGridProps) {
  // Filter modules if showDisabled is false
  const displayModules = showDisabled
    ? modules
    : modules.filter((m) => m.enabled);

  if (isLoading) {
    return (
      <div
        data-testid="module-grid"
        className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} data-testid="module-skeleton" className="animate-pulse">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (displayModules.length === 0) {
    return (
      <div
        data-testid="module-grid"
        className={`flex items-center justify-center py-12 text-muted-foreground ${className}`}
      >
        <p>No modules available</p>
      </div>
    );
  }

  return (
    <div
      data-testid="module-grid"
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {displayModules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}
