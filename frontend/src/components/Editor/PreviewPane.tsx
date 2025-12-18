/**
 * T064: PreviewPane component for displaying parsed DSL entities.
 *
 * Displays parsed entities in tabs:
 * - Services: API service definitions
 * - Models: Data structure definitions
 * - Operations: API endpoints
 * - Errors: Error response definitions
 *
 * Features:
 * - Tab navigation with entity counts
 * - Entity details display
 * - Click-to-select for bidirectional selection
 * - Loading and empty states
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Server,
  Database,
  Activity,
  AlertTriangle,
  Loader2,
  FileCode,
  ChevronRight,
} from 'lucide-react';

// Types for parsed entities
export interface SourceLocation {
  line: number;
  column: number;
}

export interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  location: SourceLocation;
}

export interface ServiceInfo {
  name: string;
  title?: string;
  version: string;
  base_path: string;
  description?: string;
  location: SourceLocation;
}

export interface ModelInfo {
  name: string;
  description?: string;
  fields: FieldInfo[];
  location: SourceLocation;
}

export interface OperationInfo {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  request_model?: string;
  response_model?: string;
  error_refs?: string[];
  tags?: string[];
  location: SourceLocation;
}

export interface ErrorInfo {
  status_code: number;
  name: string;
  description?: string;
  message?: string;
  location: SourceLocation;
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  error_type: string;
}

export interface ParsedResult {
  services: ServiceInfo[];
  models: ModelInfo[];
  operations: OperationInfo[];
  errors: ErrorInfo[];
  parse_errors: ParseError[];
  valid_entities: number;
  total_errors: number;
}

export interface EntitySelection {
  type: 'service' | 'model' | 'operation' | 'error';
  name?: string;
  index?: number;
  location: SourceLocation;
}

export interface PreviewPaneProps {
  data: ParsedResult | null;
  isLoading: boolean;
  onEntityClick?: (entity: EntitySelection) => void;
  selectedLocation?: SourceLocation;
  className?: string;
}

type TabId = 'services' | 'models' | 'operations' | 'errors';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'services', label: 'Services', icon: Server },
  { id: 'models', label: 'Models', icon: Database },
  { id: 'operations', label: 'Operations', icon: Activity },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400 method-get',
  POST: 'bg-blue-500/20 text-blue-400 method-post',
  PUT: 'bg-yellow-500/20 text-yellow-400 method-put',
  PATCH: 'bg-orange-500/20 text-orange-400 method-patch',
  DELETE: 'bg-red-500/20 text-red-400 method-delete',
};

export function PreviewPane({
  data,
  isLoading,
  onEntityClick,
  selectedLocation,
  className,
}: PreviewPaneProps) {
  const [activeTab, setActiveTab] = useState<TabId>('services');

  const counts = useMemo(() => {
    if (!data) return { services: 0, models: 0, operations: 0, errors: 0 };
    return {
      services: data.services.length,
      models: data.models.length,
      operations: data.operations.length,
      errors: data.errors.length,
    };
  }, [data]);

  const hasEntities = data && data.valid_entities > 0;

  const isLocationSelected = (location: SourceLocation): boolean => {
    return !!(
      selectedLocation &&
      location.line === selectedLocation.line &&
      location.column === selectedLocation.column
    );
  };

  const handleEntityClick = (entity: EntitySelection) => {
    onEntityClick?.(entity);
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="preview-pane" className={cn('flex flex-col h-full bg-gray-800', className)}>
        <div
          data-testid="loading-indicator"
          className="flex items-center justify-center flex-1 text-gray-400"
        >
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Parsing...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || !hasEntities) {
    return (
      <div data-testid="preview-pane" className={cn('flex flex-col h-full bg-gray-800', className)}>
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center flex-1 text-gray-400 p-4"
        >
          <FileCode className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm">No entities parsed yet</p>
          <p className="text-xs mt-1 opacity-75">Write DSL content to see the preview</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="preview-pane" className={cn('flex flex-col h-full bg-gray-800', className)}>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700" role="tablist" aria-label="Entity tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tabpanel-${id}`}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
              activeTab === id
                ? 'text-white border-b-2 border-blue-500 bg-gray-700/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span
              data-testid={`${id}-count`}
              className="px-1.5 py-0.5 text-xs rounded bg-gray-700"
            >
              {counts[id]}
            </span>
          </button>
        ))}

        {/* Parse errors badge */}
        {data.total_errors > 0 && (
          <div className="ml-auto flex items-center px-3">
            <span
              data-testid="parse-errors-badge"
              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400"
            >
              <AlertTriangle className="w-3 h-3" />
              {data.total_errors}
            </span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'services' && (
          <ServicesList
            services={data.services}
            selectedLocation={selectedLocation}
            onEntityClick={handleEntityClick}
            isLocationSelected={isLocationSelected}
          />
        )}
        {activeTab === 'models' && (
          <ModelsList
            models={data.models}
            selectedLocation={selectedLocation}
            onEntityClick={handleEntityClick}
            isLocationSelected={isLocationSelected}
          />
        )}
        {activeTab === 'operations' && (
          <OperationsList
            operations={data.operations}
            selectedLocation={selectedLocation}
            onEntityClick={handleEntityClick}
            isLocationSelected={isLocationSelected}
          />
        )}
        {activeTab === 'errors' && (
          <ErrorsList
            errors={data.errors}
            selectedLocation={selectedLocation}
            onEntityClick={handleEntityClick}
            isLocationSelected={isLocationSelected}
          />
        )}
      </div>
    </div>
  );
}

// Services List Component
interface ServicesListProps {
  services: ServiceInfo[];
  selectedLocation?: SourceLocation;
  onEntityClick: (entity: EntitySelection) => void;
  isLocationSelected: (location: SourceLocation) => boolean;
}

function ServicesList({ services, onEntityClick, isLocationSelected }: ServicesListProps) {
  if (services.length === 0) {
    return <EmptyTabContent message="No services defined" />;
  }

  return (
    <div className="space-y-3">
      {services.map((service, index) => (
        <div
          key={`${service.name}-${index}`}
          data-testid={`entity-service-${service.name}`}
          tabIndex={0}
          role="button"
          onClick={() =>
            onEntityClick({ type: 'service', name: service.name, location: service.location })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onEntityClick({ type: 'service', name: service.name, location: service.location });
            }
          }}
          className={cn(
            'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition-colors',
            isLocationSelected(service.location) && 'selected ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-white">{service.name}</span>
            <span className="text-xs text-gray-400">{service.version}</span>
          </div>
          {service.base_path && (
            <div className="mt-1 text-xs text-gray-400">Base: {service.base_path}</div>
          )}
          {service.description && (
            <div className="mt-2 text-sm text-gray-300">{service.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Models List Component
interface ModelsListProps {
  models: ModelInfo[];
  selectedLocation?: SourceLocation;
  onEntityClick: (entity: EntitySelection) => void;
  isLocationSelected: (location: SourceLocation) => boolean;
}

function ModelsList({ models, onEntityClick, isLocationSelected }: ModelsListProps) {
  if (models.length === 0) {
    return <EmptyTabContent message="No models defined" />;
  }

  return (
    <div className="space-y-3">
      {models.map((model, index) => (
        <div
          key={`${model.name}-${index}`}
          data-testid={`entity-model-${model.name}`}
          tabIndex={0}
          role="button"
          onClick={() =>
            onEntityClick({ type: 'model', name: model.name, location: model.location })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onEntityClick({ type: 'model', name: model.name, location: model.location });
            }
          }}
          className={cn(
            'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition-colors',
            isLocationSelected(model.location) && 'selected ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-white">{model.name}</span>
            </div>
            <span
              data-testid={`model-${model.name}-field-count`}
              className="text-xs text-gray-400"
            >
              {model.fields.length} fields
            </span>
          </div>
          {model.description && (
            <div className="mt-1 text-sm text-gray-300">{model.description}</div>
          )}
          {model.fields.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {model.fields.slice(0, 5).map((field) => (
                <span
                  key={field.name}
                  className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-300"
                >
                  {field.name}: {field.type}
                </span>
              ))}
              {model.fields.length > 5 && (
                <span className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-400">
                  +{model.fields.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Operations List Component
interface OperationsListProps {
  operations: OperationInfo[];
  selectedLocation?: SourceLocation;
  onEntityClick: (entity: EntitySelection) => void;
  isLocationSelected: (location: SourceLocation) => boolean;
}

function OperationsList({ operations, onEntityClick, isLocationSelected }: OperationsListProps) {
  if (operations.length === 0) {
    return <EmptyTabContent message="No operations defined" />;
  }

  return (
    <div className="space-y-3">
      {operations.map((op, index) => (
        <div
          key={`${op.method}-${op.path}-${index}`}
          data-testid={`entity-operation-${index}`}
          tabIndex={0}
          role="button"
          onClick={() => onEntityClick({ type: 'operation', index, location: op.location })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onEntityClick({ type: 'operation', index, location: op.location });
            }
          }}
          className={cn(
            'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition-colors',
            isLocationSelected(op.location) && 'selected ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-2">
            <span
              data-testid={`method-${op.method}`}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded',
                METHOD_COLORS[op.method] || 'bg-gray-600 text-gray-300'
              )}
            >
              {op.method}
            </span>
            <span className="font-mono text-sm text-white">{op.path}</span>
          </div>
          {op.description && (
            <div className="mt-1 text-sm text-gray-300">{op.description}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {op.request_model && (
              <span className="flex items-center gap-1 text-gray-400">
                <ChevronRight className="w-3 h-3" />
                Request: <span className="text-cyan-400">{op.request_model}</span>
              </span>
            )}
            {op.response_model && (
              <span className="flex items-center gap-1 text-gray-400">
                <ChevronRight className="w-3 h-3" />
                Response: <span className="text-green-400">{op.response_model}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Errors List Component
interface ErrorsListProps {
  errors: ErrorInfo[];
  selectedLocation?: SourceLocation;
  onEntityClick: (entity: EntitySelection) => void;
  isLocationSelected: (location: SourceLocation) => boolean;
}

function ErrorsList({ errors, onEntityClick, isLocationSelected }: ErrorsListProps) {
  if (errors.length === 0) {
    return <EmptyTabContent message="No error definitions" />;
  }

  return (
    <div className="space-y-3">
      {errors.map((err, index) => (
        <div
          key={`${err.status_code}-${err.name}-${index}`}
          data-testid={`entity-error-${err.name}`}
          tabIndex={0}
          role="button"
          onClick={() =>
            onEntityClick({ type: 'error', name: err.name, location: err.location })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onEntityClick({ type: 'error', name: err.name, location: err.location });
            }
          }}
          className={cn(
            'p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition-colors',
            isLocationSelected(err.location) && 'selected ring-2 ring-blue-500'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-500/20 text-red-400">
              {err.status_code}
            </span>
            <span className="font-medium text-white">{err.name}</span>
          </div>
          {err.description && (
            <div className="mt-1 text-sm text-gray-300">{err.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Empty Tab Content Component
function EmptyTabContent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default PreviewPane;
