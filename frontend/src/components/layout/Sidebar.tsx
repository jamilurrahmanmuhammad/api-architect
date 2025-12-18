/**
 * Sidebar navigation component.
 * T063: GREEN - Sidebar with module navigation.
 */

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FileCode,
  Database,
  Cpu,
  BookOpen,
  FlaskConical,
  Rocket,
  Menu,
  ChevronLeft,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useModuleStore } from '@/stores/moduleStore';

// Icon mapping from string to component
const iconMap: Record<string, LucideIcon> = {
  FileCode,
  Database,
  Cpu,
  BookOpen,
  FlaskConical,
  Rocket,
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const modules = useModuleStore((state) => state.modules);
  const isLoading = useModuleStore((state) => state.isLoading);
  const fetchModules = useModuleStore((state) => state.fetchModules);
  const getEnabledModules = useModuleStore((state) => state.getEnabledModules);

  const enabledModules = getEnabledModules();

  useEffect(() => {
    if (modules.length === 0 && !isLoading) {
      fetchModules();
    }
  }, [modules.length, isLoading, fetchModules]);

  return (
    <nav
      role="navigation"
      data-collapsed={collapsed || undefined}
      className={cn(
        'flex flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="font-semibold text-lg">Modules</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Files - Core Navigation */}
        <NavLink
          to="/files"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-2',
            'hover:bg-accent hover:text-accent-foreground',
            location.pathname === '/files' || location.pathname.startsWith('/editor')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          )}
          title={collapsed ? 'Files' : undefined}
        >
          <FolderOpen className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">Files</span>}
        </NavLink>

        {/* Divider */}
        {!collapsed && (
          <div className="mb-2 border-b pb-2">
            <span className="px-3 text-xs text-muted-foreground">Modules</span>
          </div>
        )}

        {isLoading ? (
          <div data-testid="sidebar-loading" className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {enabledModules.map((module) => {
              const Icon = iconMap[module.icon] || FileCode;
              const isActive = location.pathname === module.route;

              return (
                <li key={module.id}>
                  <NavLink
                    to={module.route}
                    data-active={isActive || undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                    title={collapsed ? module.name : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{module.name}</span>
                    )}
                    {!collapsed && module.badge && (
                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {module.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
