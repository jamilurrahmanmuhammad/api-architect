/**
 * ApiInfoTab Component
 * Form tab for editing API information (info, servers, contact, license)
 */

import { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/forms/FormField";
import { ProfileGate } from "@/components/forms/ProfileGate";
import { useFormState, useUpdateField } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** OpenAPI version options */
const OPENAPI_VERSIONS = [
  { value: "3.0.0", label: "3.0.0" },
  { value: "3.0.1", label: "3.0.1" },
  { value: "3.0.2", label: "3.0.2" },
  { value: "3.0.3", label: "3.0.3" },
  { value: "3.1.0", label: "3.1.0" },
];

/** Common license presets */
const LICENSE_PRESETS = [
  { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  { name: "GPL 3.0", url: "https://www.gnu.org/licenses/gpl-3.0.html" },
  { name: "BSD 3-Clause", url: "https://opensource.org/licenses/BSD-3-Clause" },
];

interface Server {
  url: string;
  description?: string;
}

export interface ApiInfoTabProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get error message for a specific path from the errors array
 */
function getErrorForPath(errors: Array<{ path: string; message: string }>, path: string): string | undefined {
  const error = errors.find((e) => e.path === path);
  return error?.message;
}

/**
 * ApiInfoTab component for editing basic API information.
 *
 * Fields by profile:
 * - Basic: title, version, description, openapi version, servers
 * - Advanced: + contact, license, termsOfService
 * - Technical: + externalDocs
 * - Expert: all fields
 */
export function ApiInfoTab({ className }: ApiInfoTabProps) {
  const { state } = useFormState();
  const updateField = useUpdateField();

  const { oasData, errors, editedPaths } = state;
  const info = oasData.info || {};
  const servers: Server[] = oasData.servers || [];
  const externalDocs = oasData.externalDocs || {};

  // Check if a path has been edited
  const isEdited = useCallback(
    (path: string) => editedPaths.has(path),
    [editedPaths]
  );

  // Handle adding a new server
  const handleAddServer = useCallback(() => {
    const newServers = [...servers, { url: "", description: "" }];
    updateField("/servers", newServers);
  }, [servers, updateField]);

  // Handle removing a server
  const handleRemoveServer = useCallback(
    (index: number) => {
      const newServers = servers.filter((_, i) => i !== index);
      updateField("/servers", newServers);
    },
    [servers, updateField]
  );

  // Handle server field change
  const handleServerChange = useCallback(
    (index: number, field: "url" | "description", value: string) => {
      const newServers = servers.map((server, i) => {
        if (i === index) {
          return { ...server, [field]: value };
        }
        return server;
      });
      updateField("/servers", newServers);
    },
    [servers, updateField]
  );

  // Handle license preset selection
  const handleLicensePreset = useCallback(
    (preset: { name: string; url: string }) => {
      updateField("/info/license", preset);
    },
    [updateField]
  );

  return (
    <div
      data-testid="api-info-tab"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">API Information</h2>
        <p className="text-sm text-muted-foreground">
          Basic information about your API
        </p>
      </div>

      {/* Basic Fields */}
      <div className="space-y-4">
        <FormField
          name="info-title"
          label="Title"
          value={info.title || ""}
          onChange={(value) => updateField("/info/title", value)}
          required
          path="/info/title"
          isEdited={isEdited("/info/title")}
          error={getErrorForPath(errors, "/info/title")}
          helpText="The title of your API. This will be displayed in documentation."
          placeholder="My API"
        />

        <FormField
          name="info-version"
          label="Version"
          value={info.version || ""}
          onChange={(value) => updateField("/info/version", value)}
          required
          path="/info/version"
          isEdited={isEdited("/info/version")}
          error={getErrorForPath(errors, "/info/version")}
          helpText="The version of your API (e.g., 1.0.0). Use semantic versioning."
          placeholder="1.0.0"
        />

        <FormField
          name="info-description"
          label="Description"
          type="textarea"
          value={info.description || ""}
          onChange={(value) => updateField("/info/description", value)}
          path="/info/description"
          isEdited={isEdited("/info/description")}
          error={getErrorForPath(errors, "/info/description")}
          helpText="A detailed description of your API. Markdown is supported."
          placeholder="Describe what your API does..."
          rows={4}
        />

        <FormField
          name="openapi-version"
          label="OpenAPI Version"
          type="select"
          value={oasData.openapi || "3.0.0"}
          onChange={(value) => updateField("/openapi", value)}
          options={OPENAPI_VERSIONS}
          path="/openapi"
          isEdited={isEdited("/openapi")}
          helpText="The OpenAPI Specification version. 3.1.0 adds JSON Schema support."
        />
      </div>

      {/* Servers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium">Servers</h3>
            <p className="text-sm text-muted-foreground">
              Server URLs where your API is hosted
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddServer}
            aria-label="Add server"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Server
          </Button>
        </div>

        {servers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-md">
            No servers configured. Add a server to specify where your API is hosted.
          </p>
        ) : (
          <div className="space-y-3">
            {servers.map((server, index) => (
              <div
                key={index}
                className="flex gap-2 items-start p-3 border rounded-md bg-muted/30"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    value={server.url}
                    onChange={(e) => handleServerChange(index, "url", e.target.value)}
                    placeholder="Server URL (e.g., https://api.example.com)"
                    aria-label={`Server ${index + 1} URL`}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    type="text"
                    value={server.description || ""}
                    onChange={(e) => handleServerChange(index, "description", e.target.value)}
                    placeholder="Description (e.g., Production server)"
                    aria-label={`Server ${index + 1} description`}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {getErrorForPath(errors, `/servers/${index}/url`) && (
                    <p className="text-sm text-destructive">
                      {getErrorForPath(errors, `/servers/${index}/url`)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveServer(index)}
                  aria-label="Remove server"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Section (Advanced+) */}
      <ProfileGate minProfile="Advanced">
        <fieldset className="space-y-4 border rounded-md p-4" aria-label="Contact">
          <legend className="text-base font-medium px-2">Contact</legend>
          <p className="text-sm text-muted-foreground -mt-2">
            Contact information for the API maintainers
          </p>

          <FormField
            name="contact-name"
            label="Contact Name"
            value={info.contact?.name || ""}
            onChange={(value) => updateField("/info/contact/name", value)}
            path="/info/contact/name"
            isEdited={isEdited("/info/contact/name")}
            helpText="The name of the contact person or organization."
            placeholder="API Support Team"
          />

          <FormField
            name="contact-email"
            label="Contact Email"
            type="email"
            value={info.contact?.email || ""}
            onChange={(value) => updateField("/info/contact/email", value)}
            path="/info/contact/email"
            isEdited={isEdited("/info/contact/email")}
            helpText="Contact email address."
            placeholder="support@example.com"
          />

          <FormField
            name="contact-url"
            label="Contact URL"
            type="url"
            value={info.contact?.url || ""}
            onChange={(value) => updateField("/info/contact/url", value)}
            path="/info/contact/url"
            isEdited={isEdited("/info/contact/url")}
            helpText="URL to a contact page or support portal."
            placeholder="https://support.example.com"
          />
        </fieldset>
      </ProfileGate>

      {/* License Section (Advanced+) */}
      <ProfileGate minProfile="Advanced">
        <fieldset className="space-y-4 border rounded-md p-4" aria-label="License">
          <legend className="text-base font-medium px-2">License</legend>
          <p className="text-sm text-muted-foreground -mt-2">
            License information for the API
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Common licenses:</span>
            {LICENSE_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLicensePreset(preset)}
                className="h-7 text-xs"
              >
                {preset.name}
              </Button>
            ))}
          </div>

          <FormField
            name="license-name"
            label="License Name"
            value={info.license?.name || ""}
            onChange={(value) => updateField("/info/license/name", value)}
            path="/info/license/name"
            isEdited={isEdited("/info/license/name")}
            helpText="The name of the license (e.g., MIT, Apache 2.0)."
            placeholder="MIT"
          />

          <FormField
            name="license-url"
            label="License URL"
            type="url"
            value={info.license?.url || ""}
            onChange={(value) => updateField("/info/license/url", value)}
            path="/info/license/url"
            isEdited={isEdited("/info/license/url")}
            helpText="URL to the full license text."
            placeholder="https://opensource.org/licenses/MIT"
          />
        </fieldset>
      </ProfileGate>

      {/* Terms of Service (Advanced+) */}
      <ProfileGate minProfile="Advanced">
        <FormField
          name="terms-of-service"
          label="Terms of Service"
          type="url"
          value={info.termsOfService || ""}
          onChange={(value) => updateField("/info/termsOfService", value)}
          path="/info/termsOfService"
          isEdited={isEdited("/info/termsOfService")}
          helpText="URL to the Terms of Service for your API."
          placeholder="https://example.com/terms"
        />
      </ProfileGate>

      {/* External Docs (Technical+) */}
      <ProfileGate minProfile="Technical">
        <fieldset className="space-y-4 border rounded-md p-4" aria-label="External Documentation">
          <legend className="text-base font-medium px-2">External Documentation</legend>
          <p className="text-sm text-muted-foreground -mt-2">
            Link to additional documentation
          </p>

          <FormField
            name="external-docs-url"
            label="External Docs URL"
            type="url"
            value={externalDocs.url || ""}
            onChange={(value) => updateField("/externalDocs/url", value)}
            path="/externalDocs/url"
            isEdited={isEdited("/externalDocs/url")}
            helpText="URL to external API documentation."
            placeholder="https://docs.example.com"
          />

          <FormField
            name="external-docs-description"
            label="External Docs Description"
            value={externalDocs.description || ""}
            onChange={(value) => updateField("/externalDocs/description", value)}
            path="/externalDocs/description"
            isEdited={isEdited("/externalDocs/description")}
            helpText="Short description of the external documentation."
            placeholder="Full API documentation and guides"
          />
        </fieldset>
      </ProfileGate>
    </div>
  );
}

export default ApiInfoTab;
