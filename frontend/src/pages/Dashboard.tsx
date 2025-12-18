/**
 * Dashboard page component.
 * T065/T084: GREEN - Dashboard page with ModuleGrid.
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModuleGrid } from '@/components/modules/ModuleGrid';
import { useModules } from '@/hooks/useModules';

export function Dashboard() {
  const { enabledModules, isLoading, error } = useModules();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Select a module to get started.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Module cards grid */}
      <ModuleGrid
        modules={enabledModules}
        showDisabled={false}
        isLoading={isLoading}
      />
    </div>
  );
}
