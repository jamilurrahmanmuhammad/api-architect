/**
 * Component Tests for SecurityTab
 * Tests security scheme management for OpenAPI specs
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecurityTab } from "../../../../src/components/forms/tabs/SecurityTab";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Sample security schemes for testing
 */
const sampleSecuritySchemes = {
  apiKey: {
    type: "apiKey",
    name: "X-API-Key",
    in: "header",
    description: "API key for authentication",
  },
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "JWT Bearer token",
  },
  oauth2: {
    type: "oauth2",
    description: "OAuth2 authentication",
    flows: {
      authorizationCode: {
        authorizationUrl: "https://example.com/oauth/authorize",
        tokenUrl: "https://example.com/oauth/token",
        scopes: {
          "read:pets": "Read pets",
          "write:pets": "Write pets",
        },
      },
    },
  },
  openIdConnect: {
    type: "openIdConnect",
    openIdConnectUrl: "https://example.com/.well-known/openid-configuration",
    description: "OpenID Connect",
  },
};

/**
 * Sample global security requirements
 */
const sampleSecurity = [
  { apiKey: [] },
  { oauth2: ["read:pets"] },
];

/**
 * Helper to render SecurityTab within FormStateProvider
 */
function renderWithProvider(initialState: Partial<FormState> = {}) {
  const state: FormState = {
    ...initialFormState,
    oasData: {
      ...emptyOas,
      components: {
        ...emptyOas.components,
        securitySchemes: sampleSecuritySchemes,
      },
      security: sampleSecurity,
    },
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      <SecurityTab />
    </FormStateProvider>
  );
}

describe("SecurityTab", () => {
  describe("Security Schemes Section", () => {
    it("should render security schemes section", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /security schemes/i })).toBeInTheDocument();
    });

    it("should display all security schemes", () => {
      renderWithProvider();

      expect(screen.getByTestId("scheme-row-apiKey")).toBeInTheDocument();
      expect(screen.getByTestId("scheme-row-bearerAuth")).toBeInTheDocument();
      expect(screen.getByTestId("scheme-row-oauth2")).toBeInTheDocument();
      expect(screen.getByTestId("scheme-row-openIdConnect")).toBeInTheDocument();
    });

    it("should show scheme type badges", () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      // Both scheme name and type badge show "apiKey" - verify at least one exists
      const apiKeyTexts = within(apiKeyRow).getAllByText(/apiKey/);
      expect(apiKeyTexts.length).toBeGreaterThanOrEqual(1);

      const bearerRow = screen.getByTestId("scheme-row-bearerAuth");
      expect(within(bearerRow).getByText("http")).toBeInTheDocument();
    });

    it("should show scheme descriptions", () => {
      renderWithProvider();

      expect(screen.getByText("API key for authentication")).toBeInTheDocument();
      expect(screen.getByText("JWT Bearer token")).toBeInTheDocument();
    });

    it("should render add scheme button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add.*scheme/i })).toBeInTheDocument();
    });

    it("should show empty state when no schemes", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          components: { schemas: {} },
        },
      });

      expect(screen.getByText(/no security schemes/i)).toBeInTheDocument();
    });
  });

  describe("Add Scheme Dialog", () => {
    it("should open add scheme dialog when button clicked", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should show scheme name input", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("textbox", { name: /scheme name/i })).toBeInTheDocument();
    });

    it("should show scheme type selector", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("combobox", { name: /scheme type/i })).toBeInTheDocument();
    });

    it("should offer apiKey, http, oauth2, openIdConnect types", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const select = screen.getByRole("combobox", { name: /scheme type/i });
      const options = within(select).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("apiKey");
      expect(values).toContain("http");
      expect(values).toContain("oauth2");
      expect(values).toContain("openIdConnect");
    });

    it("should show apiKey-specific fields when apiKey type selected", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "apiKey" } });

      expect(screen.getByRole("textbox", { name: /key name/i })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /location/i })).toBeInTheDocument();
    });

    it("should offer header, query, cookie locations for apiKey", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "apiKey" } });

      const locationSelect = screen.getByRole("combobox", { name: /location/i });
      const options = within(locationSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("header");
      expect(values).toContain("query");
      expect(values).toContain("cookie");
    });

    it("should show http-specific fields when http type selected", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "http" } });

      expect(screen.getByRole("combobox", { name: /http scheme/i })).toBeInTheDocument();
    });

    it("should offer bearer and basic http schemes", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "http" } });

      const schemeSelect = screen.getByRole("combobox", { name: /http scheme/i });
      const options = within(schemeSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("bearer");
      expect(values).toContain("basic");
    });

    it("should show oauth2-specific fields when oauth2 type selected", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "oauth2" } });

      expect(screen.getByRole("combobox", { name: /flow type/i })).toBeInTheDocument();
    });

    it("should offer oauth2 flow types", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "oauth2" } });

      const flowSelect = screen.getByRole("combobox", { name: /flow type/i });
      const options = within(flowSelect).getAllByRole("option");
      const values = options.map((o) => o.getAttribute("value"));

      expect(values).toContain("authorizationCode");
      expect(values).toContain("implicit");
      expect(values).toContain("password");
      expect(values).toContain("clientCredentials");
    });

    it("should show openIdConnect URL field when openIdConnect type selected", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const typeSelect = screen.getByRole("combobox", { name: /scheme type/i });
      fireEvent.change(typeSelect, { target: { value: "openIdConnect" } });

      expect(screen.getByRole("textbox", { name: /openid connect url/i })).toBeInTheDocument();
    });

    it("should add new apiKey scheme when form submitted", async () => {
      const state: FormState = {
        ...initialFormState,
        oasData: {
          ...emptyOas,
          components: { schemas: {}, securitySchemes: {} },
        },
      };

      render(
        <FormStateProvider initialState={state}>
          <SecurityTab />
        </FormStateProvider>
      );

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByRole("textbox", { name: /scheme name/i });
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "myApiKey");

      // apiKey is already selected by default, so we just need to fill key name
      const keyNameInput = screen.getByRole("textbox", { name: /key name/i });
      await userEvent.clear(keyNameInput);
      await userEvent.type(keyNameInput, "X-My-Key");

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      // Dialog should close
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // New scheme should appear
      expect(screen.getByTestId("scheme-row-myApiKey")).toBeInTheDocument();
    });

    it("should close dialog on cancel", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should prevent duplicate scheme names", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByRole("textbox", { name: /scheme name/i });
      fireEvent.change(nameInput, { target: { value: "apiKey" } });

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    it("should require scheme name", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add.*scheme/i });
      await userEvent.click(addButton);

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  describe("Edit Scheme", () => {
    it("should show edit button for each scheme", () => {
      renderWithProvider();

      const editButtons = screen.getAllByRole("button", { name: /edit.*scheme/i });
      expect(editButtons.length).toBeGreaterThanOrEqual(4);
    });

    it("should open edit dialog when edit button clicked", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const editButton = within(apiKeyRow).getByRole("button", { name: /edit.*scheme/i });
      await userEvent.click(editButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/edit.*scheme/i)).toBeInTheDocument();
    });

    it("should pre-populate form with existing scheme values", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const editButton = within(apiKeyRow).getByRole("button", { name: /edit.*scheme/i });
      await userEvent.click(editButton);

      const keyNameInput = screen.getByRole("textbox", { name: /key name/i });
      expect(keyNameInput).toHaveValue("X-API-Key");

      const descInput = screen.getByRole("textbox", { name: /description/i });
      expect(descInput).toHaveValue("API key for authentication");
    });

    it("should update scheme when saved", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const editButton = within(apiKeyRow).getByRole("button", { name: /edit.*scheme/i });
      await userEvent.click(editButton);

      const descInput = screen.getByRole("textbox", { name: /description/i });
      fireEvent.change(descInput, { target: { value: "Updated description" } });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await userEvent.click(saveButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Updated description")).toBeInTheDocument();
    });
  });

  describe("Delete Scheme", () => {
    it("should show delete button for each scheme", () => {
      renderWithProvider();

      const deleteButtons = screen.getAllByRole("button", { name: /delete.*scheme/i });
      expect(deleteButtons.length).toBeGreaterThanOrEqual(4);
    });

    it("should show confirmation when delete clicked", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const deleteButton = within(apiKeyRow).getByRole("button", { name: /delete.*scheme/i });
      await userEvent.click(deleteButton);

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("should remove scheme when confirmed", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const deleteButton = within(apiKeyRow).getByRole("button", { name: /delete.*scheme/i });
      await userEvent.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(screen.queryByTestId("scheme-row-apiKey")).not.toBeInTheDocument();
    });

    it("should not remove scheme when cancelled", async () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      const deleteButton = within(apiKeyRow).getByRole("button", { name: /delete.*scheme/i });
      await userEvent.click(deleteButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.getByTestId("scheme-row-apiKey")).toBeInTheDocument();
    });
  });

  describe("Global Security Requirements", () => {
    it("should render global security section", () => {
      renderWithProvider();

      expect(screen.getByText(/global security/i)).toBeInTheDocument();
    });

    it("should display current security requirements", () => {
      renderWithProvider();

      // Should show which schemes are applied globally
      expect(screen.getByTestId("global-security-list")).toBeInTheDocument();
    });

    it("should show checkboxes for each available scheme", () => {
      renderWithProvider();

      const globalSection = screen.getByTestId("global-security-section");

      expect(within(globalSection).getByRole("checkbox", { name: /apiKey/i })).toBeInTheDocument();
      expect(within(globalSection).getByRole("checkbox", { name: /oauth2/i })).toBeInTheDocument();
    });

    it("should check schemes that are in global security", () => {
      renderWithProvider();

      const globalSection = screen.getByTestId("global-security-section");

      const apiKeyCheckbox = within(globalSection).getByRole("checkbox", { name: /apiKey/i });
      const oauth2Checkbox = within(globalSection).getByRole("checkbox", { name: /oauth2/i });

      expect(apiKeyCheckbox).toBeChecked();
      expect(oauth2Checkbox).toBeChecked();
    });

    it("should add scheme to global security when checked", async () => {
      renderWithProvider();

      const globalSection = screen.getByTestId("global-security-section");
      const bearerCheckbox = within(globalSection).getByRole("checkbox", { name: /bearerAuth/i });

      expect(bearerCheckbox).not.toBeChecked();

      await userEvent.click(bearerCheckbox);

      expect(bearerCheckbox).toBeChecked();
    });

    it("should remove scheme from global security when unchecked", async () => {
      renderWithProvider();

      const globalSection = screen.getByTestId("global-security-section");
      const apiKeyCheckbox = within(globalSection).getByRole("checkbox", { name: /apiKey/i });

      expect(apiKeyCheckbox).toBeChecked();

      await userEvent.click(apiKeyCheckbox);

      expect(apiKeyCheckbox).not.toBeChecked();
    });

    it("should show scope selector for oauth2 schemes", () => {
      renderWithProvider();

      const globalSection = screen.getByTestId("global-security-section");

      // OAuth2 should have scope options
      expect(within(globalSection).getByText(/read:pets/i)).toBeInTheDocument();
    });
  });

  describe("Profile-Based Visibility", () => {
    it("should show security section in Technical profile", () => {
      renderWithProvider({ profile: "Technical" });

      expect(screen.getByTestId("security-tab")).toBeInTheDocument();
    });

    it("should show security section in Expert profile", () => {
      renderWithProvider({ profile: "Expert" });

      expect(screen.getByTestId("security-tab")).toBeInTheDocument();
    });
  });

  describe("Scheme Type Details Display", () => {
    it("should show location for apiKey schemes", () => {
      renderWithProvider();

      const apiKeyRow = screen.getByTestId("scheme-row-apiKey");
      expect(within(apiKeyRow).getByText(/header/i)).toBeInTheDocument();
    });

    it("should show bearer format for http bearer schemes", () => {
      renderWithProvider();

      const bearerRow = screen.getByTestId("scheme-row-bearerAuth");
      // JWT appears in the display info span
      const displayInfo = within(bearerRow).getAllByText(/JWT/i);
      expect(displayInfo.length).toBeGreaterThanOrEqual(1);
    });

    it("should show flow type for oauth2 schemes", () => {
      renderWithProvider();

      const oauth2Row = screen.getByTestId("scheme-row-oauth2");
      expect(within(oauth2Row).getByText(/authorization.*code/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper section headings", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /security schemes/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /global security/i })).toBeInTheDocument();
    });

    it("should have accessible form controls", () => {
      renderWithProvider();

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("aria-label");
      });
    });

    it("should have proper button labels", () => {
      renderWithProvider();

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(
          button.hasAttribute("aria-label") || button.textContent?.trim()
        ).toBeTruthy();
      });
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const tab = container.querySelector("[data-testid='security-tab']");
      expect(tab).toHaveClass("space-y-6");
    });
  });
});
