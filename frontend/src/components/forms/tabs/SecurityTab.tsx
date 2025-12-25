/**
 * SecurityTab Component
 * Form tab for managing security schemes and global security requirements
 */

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X, Shield, Key, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormState, useUpdateField } from "@/providers/FormStateProvider";
import { Button } from "@/components/ui/button";

/** Security scheme types */
const SCHEME_TYPES = [
  { value: "apiKey", label: "API Key" },
  { value: "http", label: "HTTP" },
  { value: "oauth2", label: "OAuth 2.0" },
  { value: "openIdConnect", label: "OpenID Connect" },
];

/** API key locations */
const API_KEY_LOCATIONS = [
  { value: "header", label: "Header" },
  { value: "query", label: "Query" },
  { value: "cookie", label: "Cookie" },
];

/** HTTP schemes */
const HTTP_SCHEMES = [
  { value: "bearer", label: "Bearer" },
  { value: "basic", label: "Basic" },
];

/** OAuth2 flow types */
const OAUTH2_FLOWS = [
  { value: "authorizationCode", label: "Authorization Code" },
  { value: "implicit", label: "Implicit" },
  { value: "password", label: "Password" },
  { value: "clientCredentials", label: "Client Credentials" },
];

interface SecurityScheme {
  type: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  flows?: {
    [flowType: string]: {
      authorizationUrl?: string;
      tokenUrl?: string;
      refreshUrl?: string;
      scopes?: Record<string, string>;
    };
  };
  openIdConnectUrl?: string;
}

interface SecurityRequirement {
  [schemeName: string]: string[];
}

export interface SecurityTabProps {
  className?: string;
}

/**
 * Get display info for a security scheme
 */
function getSchemeDisplayInfo(scheme: SecurityScheme): string {
  switch (scheme.type) {
    case "apiKey":
      return `${scheme.in || "header"}`;
    case "http":
      if (scheme.scheme === "bearer" && scheme.bearerFormat) {
        return `${scheme.bearerFormat}`;
      }
      return scheme.scheme || "bearer";
    case "oauth2":
      const flowTypes = Object.keys(scheme.flows || {});
      return flowTypes.length > 0 ? flowTypes[0].replace(/([A-Z])/g, " $1").trim() : "OAuth2";
    case "openIdConnect":
      return "OIDC";
    default:
      return scheme.type;
  }
}

/**
 * Get icon for scheme type
 */
function getSchemeIcon(type: string) {
  switch (type) {
    case "apiKey":
      return Key;
    case "http":
      return Lock;
    default:
      return Shield;
  }
}

/**
 * SecurityTab component for managing security schemes and requirements.
 */
export function SecurityTab({ className }: SecurityTabProps) {
  const { state } = useFormState();
  const updateField = useUpdateField();

  const securitySchemes: Record<string, SecurityScheme> =
    state.oasData?.components?.securitySchemes || {};
  const globalSecurity: SecurityRequirement[] = state.oasData?.security || [];

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Form states for add/edit dialog
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("apiKey");
  const [formDescription, setFormDescription] = useState("");
  const [formKeyName, setFormKeyName] = useState("");
  const [formKeyIn, setFormKeyIn] = useState("header");
  const [formHttpScheme, setFormHttpScheme] = useState("bearer");
  const [formBearerFormat, setFormBearerFormat] = useState("");
  const [formOAuthFlow, setFormOAuthFlow] = useState("authorizationCode");
  const [formAuthUrl, setFormAuthUrl] = useState("");
  const [formTokenUrl, setFormTokenUrl] = useState("");
  const [formOpenIdUrl, setFormOpenIdUrl] = useState("");

  // Get sorted scheme names
  const schemeNames = useMemo(() => {
    return Object.keys(securitySchemes).sort();
  }, [securitySchemes]);

  // Check if a scheme is in global security
  const isSchemeInGlobalSecurity = useCallback(
    (schemeName: string): boolean => {
      return globalSecurity.some((req) => schemeName in req);
    },
    [globalSecurity]
  );

  // Get all available scopes for an oauth2 scheme
  const getAvailableScopes = useCallback(
    (schemeName: string): Record<string, string> => {
      const scheme = securitySchemes[schemeName];
      if (scheme?.type !== "oauth2" || !scheme.flows) return {};

      const allScopes: Record<string, string> = {};
      Object.values(scheme.flows).forEach((flow) => {
        if (flow.scopes) {
          Object.assign(allScopes, flow.scopes);
        }
      });
      return allScopes;
    },
    [securitySchemes]
  );

  // Reset form fields
  const resetForm = useCallback(() => {
    setFormName("");
    setFormType("apiKey");
    setFormDescription("");
    setFormKeyName("");
    setFormKeyIn("header");
    setFormHttpScheme("bearer");
    setFormBearerFormat("");
    setFormOAuthFlow("authorizationCode");
    setFormAuthUrl("");
    setFormTokenUrl("");
    setFormOpenIdUrl("");
    setAddError(null);
  }, []);

  // Populate form for editing
  const populateFormForEdit = useCallback((name: string) => {
    const scheme = securitySchemes[name];
    if (!scheme) return;

    setFormName(name);
    setFormType(scheme.type);
    setFormDescription(scheme.description || "");

    if (scheme.type === "apiKey") {
      setFormKeyName(scheme.name || "");
      setFormKeyIn(scheme.in || "header");
    } else if (scheme.type === "http") {
      setFormHttpScheme(scheme.scheme || "bearer");
      setFormBearerFormat(scheme.bearerFormat || "");
    } else if (scheme.type === "oauth2" && scheme.flows) {
      const flowType = Object.keys(scheme.flows)[0] || "authorizationCode";
      setFormOAuthFlow(flowType);
      const flow = scheme.flows[flowType];
      setFormAuthUrl(flow?.authorizationUrl || "");
      setFormTokenUrl(flow?.tokenUrl || "");
    } else if (scheme.type === "openIdConnect") {
      setFormOpenIdUrl(scheme.openIdConnectUrl || "");
    }
  }, [securitySchemes]);

  // Handle opening edit dialog
  const handleOpenEdit = useCallback((name: string) => {
    setSelectedScheme(name);
    populateFormForEdit(name);
    setShowEditDialog(true);
  }, [populateFormForEdit]);

  // Handle opening delete confirmation
  const handleOpenDelete = useCallback((name: string) => {
    setSelectedScheme(name);
    setShowDeleteConfirm(true);
  }, []);

  // Build scheme object from form
  const buildSchemeFromForm = useCallback((): SecurityScheme => {
    const scheme: SecurityScheme = {
      type: formType,
      description: formDescription || undefined,
    };

    switch (formType) {
      case "apiKey":
        scheme.name = formKeyName;
        scheme.in = formKeyIn;
        break;
      case "http":
        scheme.scheme = formHttpScheme;
        if (formHttpScheme === "bearer" && formBearerFormat) {
          scheme.bearerFormat = formBearerFormat;
        }
        break;
      case "oauth2":
        scheme.flows = {
          [formOAuthFlow]: {
            ...(["authorizationCode", "implicit"].includes(formOAuthFlow) && {
              authorizationUrl: formAuthUrl || "https://example.com/oauth/authorize",
            }),
            ...(["authorizationCode", "password", "clientCredentials"].includes(formOAuthFlow) && {
              tokenUrl: formTokenUrl || "https://example.com/oauth/token",
            }),
            scopes: {},
          },
        };
        break;
      case "openIdConnect":
        scheme.openIdConnectUrl = formOpenIdUrl;
        break;
    }

    return scheme;
  }, [
    formType,
    formDescription,
    formKeyName,
    formKeyIn,
    formHttpScheme,
    formBearerFormat,
    formOAuthFlow,
    formAuthUrl,
    formTokenUrl,
    formOpenIdUrl,
  ]);

  // Handle add scheme
  const handleAddScheme = useCallback(() => {
    setAddError(null);

    if (!formName.trim()) {
      setAddError("Scheme name is required");
      return;
    }

    if (securitySchemes[formName]) {
      setAddError(`Scheme "${formName}" already exists`);
      return;
    }

    const newScheme = buildSchemeFromForm();
    const newSchemes = {
      ...securitySchemes,
      [formName]: newScheme,
    };

    updateField("/components/securitySchemes", newSchemes);
    setShowAddDialog(false);
    resetForm();
  }, [formName, securitySchemes, buildSchemeFromForm, updateField, resetForm]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!selectedScheme) return;

    const updatedScheme = buildSchemeFromForm();
    const newSchemes = {
      ...securitySchemes,
      [selectedScheme]: updatedScheme,
    };

    updateField("/components/securitySchemes", newSchemes);
    setShowEditDialog(false);
    setSelectedScheme(null);
    resetForm();
  }, [selectedScheme, securitySchemes, buildSchemeFromForm, updateField, resetForm]);

  // Handle delete scheme
  const handleDeleteScheme = useCallback(() => {
    if (!selectedScheme) return;

    const newSchemes = { ...securitySchemes };
    delete newSchemes[selectedScheme];

    updateField("/components/securitySchemes", newSchemes);

    // Also remove from global security
    const newSecurity = globalSecurity.filter((req) => !(selectedScheme in req));
    updateField("/security", newSecurity);

    setShowDeleteConfirm(false);
    setSelectedScheme(null);
  }, [selectedScheme, securitySchemes, globalSecurity, updateField]);

  // Handle toggle global security
  const handleToggleGlobalSecurity = useCallback(
    (schemeName: string) => {
      const isCurrentlyEnabled = isSchemeInGlobalSecurity(schemeName);

      let newSecurity: SecurityRequirement[];

      if (isCurrentlyEnabled) {
        // Remove from global security
        newSecurity = globalSecurity.filter((req) => !(schemeName in req));
      } else {
        // Add to global security
        newSecurity = [...globalSecurity, { [schemeName]: [] }];
      }

      updateField("/security", newSecurity);
    },
    [globalSecurity, isSchemeInGlobalSecurity, updateField]
  );

  // Render form fields based on scheme type
  const renderTypeSpecificFields = () => {
    switch (formType) {
      case "apiKey":
        return (
          <>
            <div>
              <label
                htmlFor="key-name"
                className="block text-sm font-medium mb-1"
              >
                Key Name
              </label>
              <input
                type="text"
                id="key-name"
                value={formKeyName}
                onChange={(e) => setFormKeyName(e.target.value)}
                aria-label="Key name"
                placeholder="X-API-Key"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="key-location"
                className="block text-sm font-medium mb-1"
              >
                Location
              </label>
              <select
                id="key-location"
                value={formKeyIn}
                onChange={(e) => setFormKeyIn(e.target.value)}
                aria-label="Location"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {API_KEY_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        );

      case "http":
        return (
          <>
            <div>
              <label
                htmlFor="http-scheme"
                className="block text-sm font-medium mb-1"
              >
                HTTP Scheme
              </label>
              <select
                id="http-scheme"
                value={formHttpScheme}
                onChange={(e) => setFormHttpScheme(e.target.value)}
                aria-label="HTTP scheme"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {HTTP_SCHEMES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {formHttpScheme === "bearer" && (
              <div>
                <label
                  htmlFor="bearer-format"
                  className="block text-sm font-medium mb-1"
                >
                  Bearer Format (optional)
                </label>
                <input
                  type="text"
                  id="bearer-format"
                  value={formBearerFormat}
                  onChange={(e) => setFormBearerFormat(e.target.value)}
                  aria-label="Bearer format"
                  placeholder="JWT"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </>
        );

      case "oauth2":
        return (
          <>
            <div>
              <label
                htmlFor="oauth-flow"
                className="block text-sm font-medium mb-1"
              >
                Flow Type
              </label>
              <select
                id="oauth-flow"
                value={formOAuthFlow}
                onChange={(e) => setFormOAuthFlow(e.target.value)}
                aria-label="Flow type"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {OAUTH2_FLOWS.map((flow) => (
                  <option key={flow.value} value={flow.value}>
                    {flow.label}
                  </option>
                ))}
              </select>
            </div>
            {["authorizationCode", "implicit"].includes(formOAuthFlow) && (
              <div>
                <label
                  htmlFor="auth-url"
                  className="block text-sm font-medium mb-1"
                >
                  Authorization URL
                </label>
                <input
                  type="text"
                  id="auth-url"
                  value={formAuthUrl}
                  onChange={(e) => setFormAuthUrl(e.target.value)}
                  aria-label="Authorization URL"
                  placeholder="https://example.com/oauth/authorize"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
            {["authorizationCode", "password", "clientCredentials"].includes(formOAuthFlow) && (
              <div>
                <label
                  htmlFor="token-url"
                  className="block text-sm font-medium mb-1"
                >
                  Token URL
                </label>
                <input
                  type="text"
                  id="token-url"
                  value={formTokenUrl}
                  onChange={(e) => setFormTokenUrl(e.target.value)}
                  aria-label="Token URL"
                  placeholder="https://example.com/oauth/token"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
          </>
        );

      case "openIdConnect":
        return (
          <div>
            <label
              htmlFor="openid-url"
              className="block text-sm font-medium mb-1"
            >
              OpenID Connect URL
            </label>
            <input
              type="text"
              id="openid-url"
              value={formOpenIdUrl}
              onChange={(e) => setFormOpenIdUrl(e.target.value)}
              aria-label="OpenID Connect URL"
              placeholder="https://example.com/.well-known/openid-configuration"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      data-testid="security-tab"
      className={cn("space-y-6", className)}
    >
      {/* Security Schemes Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Security Schemes</h3>
            <p className="text-sm text-muted-foreground">
              Define authentication methods for your API
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            aria-label="Add scheme"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Scheme
          </Button>
        </div>

        {schemeNames.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-md">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No security schemes defined yet.</p>
            <p className="text-xs text-muted-foreground">
              Add security schemes to protect your API endpoints.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {schemeNames.map((name) => {
              const scheme = securitySchemes[name];
              const Icon = getSchemeIcon(scheme.type);
              const displayInfo = getSchemeDisplayInfo(scheme);

              return (
                <div
                  key={name}
                  data-testid={`scheme-row-${name}`}
                  className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50"
                >
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {scheme.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {displayInfo}
                      </span>
                    </div>
                    {scheme.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {scheme.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(name)}
                      aria-label="Edit scheme"
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(name)}
                      aria-label="Delete scheme"
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Global Security Requirements Section */}
      <section data-testid="global-security-section">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Global Security</h3>
          <p className="text-sm text-muted-foreground">
            Select which security schemes apply to all operations by default
          </p>
        </div>

        {schemeNames.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-md">
            <p className="text-sm text-muted-foreground">
              Add security schemes first to configure global security.
            </p>
          </div>
        ) : (
          <div data-testid="global-security-list" className="space-y-3">
            {schemeNames.map((name) => {
              const scheme = securitySchemes[name];
              const isEnabled = isSchemeInGlobalSecurity(name);
              const availableScopes = getAvailableScopes(name);
              const hasScopes = Object.keys(availableScopes).length > 0;

              return (
                <div
                  key={name}
                  className="flex items-start gap-3 p-3 border rounded-md"
                >
                  <input
                    type="checkbox"
                    id={`global-${name}`}
                    checked={isEnabled}
                    onChange={() => handleToggleGlobalSecurity(name)}
                    aria-label={name}
                    className="h-4 w-4 rounded border-gray-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`global-${name}`}
                      className="font-medium cursor-pointer"
                    >
                      {name}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {scheme.type}
                      {scheme.description && ` - ${scheme.description}`}
                    </p>

                    {/* Show scopes for oauth2 */}
                    {hasScopes && isEnabled && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(availableScopes).map(([scope, desc]) => (
                          <span
                            key={scope}
                            className="text-xs px-2 py-0.5 rounded bg-muted"
                            title={desc}
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Scheme Dialog */}
      {showAddDialog && (
        <div
          role="dialog"
          aria-labelledby="add-scheme-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 id="add-scheme-title" className="text-lg font-semibold">
                Add Security Scheme
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="scheme-name"
                  className="block text-sm font-medium mb-1"
                >
                  Scheme Name
                </label>
                <input
                  type="text"
                  id="scheme-name"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setAddError(null);
                  }}
                  aria-label="Scheme name"
                  placeholder="myApiKey"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="scheme-type"
                  className="block text-sm font-medium mb-1"
                >
                  Scheme Type
                </label>
                <select
                  id="scheme-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  aria-label="Scheme type"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SCHEME_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {renderTypeSpecificFields()}

              <div>
                <label
                  htmlFor="scheme-description"
                  className="block text-sm font-medium mb-1"
                >
                  Description (optional)
                </label>
                <input
                  type="text"
                  id="scheme-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  aria-label="Description"
                  placeholder="Describe this security scheme..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddScheme}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Scheme Dialog */}
      {showEditDialog && selectedScheme && (
        <div
          role="dialog"
          aria-labelledby="edit-scheme-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 id="edit-scheme-title" className="text-lg font-semibold">
                Edit Scheme: {selectedScheme}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedScheme(null);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {renderTypeSpecificFields()}

              <div>
                <label
                  htmlFor="edit-description"
                  className="block text-sm font-medium mb-1"
                >
                  Description (optional)
                </label>
                <input
                  type="text"
                  id="edit-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  aria-label="Description"
                  placeholder="Describe this security scheme..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedScheme(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && selectedScheme && (
        <div
          role="dialog"
          aria-labelledby="delete-scheme-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h3 id="delete-scheme-title" className="text-lg font-semibold mb-2">
              Delete Security Scheme
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete "{selectedScheme}"? This will also remove it from global security requirements.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedScheme(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteScheme}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityTab;
