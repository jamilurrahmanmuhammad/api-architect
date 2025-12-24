/**
 * Component Tests for ApiInfoTab
 * Tests API Info form tab with title, version, description, servers, contact, license
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { ApiInfoTab } from "../../../../src/components/forms/tabs/ApiInfoTab";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Helper to render ApiInfoTab within FormStateProvider
 */
function renderWithProvider(
  initialState: Partial<FormState> = {},
  ui?: ReactNode
) {
  const state: FormState = {
    ...initialFormState,
    ...initialState,
  };

  return render(
    <FormStateProvider initialState={state}>
      {ui || <ApiInfoTab />}
    </FormStateProvider>
  );
}

describe("ApiInfoTab", () => {
  describe("Basic Fields", () => {
    it("should render title field", () => {
      renderWithProvider();

      expect(screen.getByRole("textbox", { name: /^title/i })).toBeInTheDocument();
    });

    it("should render version field", () => {
      renderWithProvider();

      expect(screen.getByRole("textbox", { name: /^version/i })).toBeInTheDocument();
    });

    it("should render description field as textarea", () => {
      renderWithProvider();

      const description = screen.getByRole("textbox", { name: /^description/i });
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe("TEXTAREA");
    });

    it("should display current title value from state", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          info: { ...emptyOas.info, title: "My API" },
        },
      });

      expect(screen.getByRole("textbox", { name: /^title/i })).toHaveValue("My API");
    });

    it("should display current version value from state", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          info: { ...emptyOas.info, version: "2.0.0" },
        },
      });

      expect(screen.getByRole("textbox", { name: /^version/i })).toHaveValue("2.0.0");
    });

    it("should display current description value from state", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          info: { ...emptyOas.info, description: "API description" },
        },
      });

      expect(screen.getByRole("textbox", { name: /^description/i })).toHaveValue("API description");
    });

    it("should update title when user types", async () => {
      renderWithProvider();

      const titleInput = screen.getByRole("textbox", { name: /^title/i });
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, "New Title");

      expect(titleInput).toHaveValue("New Title");
    });

    it("should mark title as required", () => {
      renderWithProvider();

      const titleInput = screen.getByRole("textbox", { name: /^title/i });
      expect(titleInput).toBeRequired();
    });

    it("should mark version as required", () => {
      renderWithProvider();

      const versionInput = screen.getByRole("textbox", { name: /^version/i });
      expect(versionInput).toBeRequired();
    });
  });

  describe("OpenAPI Version Field", () => {
    it("should render openapi version selector", () => {
      renderWithProvider();

      expect(screen.getByRole("combobox", { name: /openapi version/i })).toBeInTheDocument();
    });

    it("should display current openapi version", () => {
      renderWithProvider({
        oasData: { ...emptyOas, openapi: "3.1.0" },
      });

      expect(screen.getByRole("combobox", { name: /openapi version/i })).toHaveValue("3.1.0");
    });

    it("should offer 3.0.x and 3.1.x options", () => {
      renderWithProvider();

      const selector = screen.getByRole("combobox", { name: /openapi version/i });
      const options = within(selector).getAllByRole("option");

      const values = options.map((o) => o.getAttribute("value"));
      expect(values).toContain("3.0.0");
      expect(values).toContain("3.0.3");
      expect(values).toContain("3.1.0");
    });
  });

  describe("Servers Section", () => {
    it("should render servers section", () => {
      renderWithProvider();

      expect(screen.getByText(/servers/i)).toBeInTheDocument();
    });

    it("should display existing servers", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [
            { url: "https://api.example.com", description: "Production" },
            { url: "https://staging.example.com", description: "Staging" },
          ],
        },
      });

      expect(screen.getByDisplayValue("https://api.example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://staging.example.com")).toBeInTheDocument();
    });

    it("should render add server button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add server/i })).toBeInTheDocument();
    });

    it("should add new server when add button clicked", async () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [{ url: "https://api.example.com", description: "Production" }],
        },
      });

      const addButton = screen.getByRole("button", { name: /add server/i });
      await userEvent.click(addButton);

      // Should now have 2 server URL inputs
      const urlInputs = screen.getAllByPlaceholderText(/server url/i);
      expect(urlInputs.length).toBe(2);
    });

    it("should render remove button for each server", () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [
            { url: "https://api.example.com", description: "Production" },
            { url: "https://staging.example.com", description: "Staging" },
          ],
        },
      });

      const removeButtons = screen.getAllByRole("button", { name: /remove server/i });
      expect(removeButtons.length).toBe(2);
    });

    it("should remove server when remove button clicked", async () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [
            { url: "https://api.example.com", description: "Production" },
            { url: "https://staging.example.com", description: "Staging" },
          ],
        },
      });

      const removeButtons = screen.getAllByRole("button", { name: /remove server/i });
      await userEvent.click(removeButtons[0]);

      // First server should be removed
      expect(screen.queryByDisplayValue("https://api.example.com")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("https://staging.example.com")).toBeInTheDocument();
    });

    it("should allow editing server URL", async () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [{ url: "https://api.example.com", description: "Production" }],
        },
      });

      const urlInput = screen.getByDisplayValue("https://api.example.com");
      fireEvent.change(urlInput, { target: { value: "https://new-api.example.com" } });

      expect(urlInput).toHaveValue("https://new-api.example.com");
    });

    it("should allow editing server description", async () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          servers: [{ url: "https://api.example.com", description: "Production" }],
        },
      });

      const descInput = screen.getByDisplayValue("Production");
      fireEvent.change(descInput, { target: { value: "Main Server" } });

      expect(descInput).toHaveValue("Main Server");
    });

    it("should show empty state when no servers", () => {
      renderWithProvider({
        oasData: { ...emptyOas, servers: [] },
      });

      expect(screen.getByText(/no servers configured/i)).toBeInTheDocument();
    });
  });

  describe("Contact Fields (Advanced Profile)", () => {
    it("should not show contact fields in Basic profile", () => {
      renderWithProvider({ profile: "Basic" });

      expect(screen.queryByRole("textbox", { name: /^contact name/i })).not.toBeInTheDocument();
    });

    it("should show contact fields in Advanced profile", () => {
      renderWithProvider({ profile: "Advanced" });

      expect(screen.getByRole("textbox", { name: /^contact name/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /^contact email/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /^contact url/i })).toBeInTheDocument();
    });

    it("should display existing contact values", () => {
      renderWithProvider({
        profile: "Advanced",
        oasData: {
          ...emptyOas,
          info: {
            ...emptyOas.info,
            contact: {
              name: "API Support",
              email: "support@example.com",
              url: "https://support.example.com",
            },
          },
        },
      });

      expect(screen.getByRole("textbox", { name: /^contact name/i })).toHaveValue("API Support");
      expect(screen.getByRole("textbox", { name: /^contact email/i })).toHaveValue("support@example.com");
      expect(screen.getByRole("textbox", { name: /^contact url/i })).toHaveValue("https://support.example.com");
    });

    it("should update contact name when user types", async () => {
      renderWithProvider({ profile: "Advanced" });

      const nameInput = screen.getByRole("textbox", { name: /^contact name/i });
      await userEvent.type(nameInput, "John Doe");

      expect(nameInput).toHaveValue("John Doe");
    });
  });

  describe("License Fields (Advanced Profile)", () => {
    it("should not show license fields in Basic profile", () => {
      renderWithProvider({ profile: "Basic" });

      expect(screen.queryByRole("textbox", { name: /^license name/i })).not.toBeInTheDocument();
    });

    it("should show license fields in Advanced profile", () => {
      renderWithProvider({ profile: "Advanced" });

      expect(screen.getByRole("textbox", { name: /^license name/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /^license url/i })).toBeInTheDocument();
    });

    it("should display existing license values", () => {
      renderWithProvider({
        profile: "Advanced",
        oasData: {
          ...emptyOas,
          info: {
            ...emptyOas.info,
            license: {
              name: "MIT",
              url: "https://opensource.org/licenses/MIT",
            },
          },
        },
      });

      expect(screen.getByRole("textbox", { name: /^license name/i })).toHaveValue("MIT");
      expect(screen.getByRole("textbox", { name: /^license url/i })).toHaveValue(
        "https://opensource.org/licenses/MIT"
      );
    });

    it("should offer common license presets", () => {
      renderWithProvider({ profile: "Advanced" });

      // Should have a preset selector or suggestions
      expect(screen.getByText(/common licenses/i)).toBeInTheDocument();
    });
  });

  describe("Terms of Service (Advanced Profile)", () => {
    it("should not show termsOfService in Basic profile", () => {
      renderWithProvider({ profile: "Basic" });

      expect(screen.queryByRole("textbox", { name: /^terms of service/i })).not.toBeInTheDocument();
    });

    it("should show termsOfService in Advanced profile", () => {
      renderWithProvider({ profile: "Advanced" });

      expect(screen.getByRole("textbox", { name: /^terms of service/i })).toBeInTheDocument();
    });

    it("should display existing termsOfService URL", () => {
      renderWithProvider({
        profile: "Advanced",
        oasData: {
          ...emptyOas,
          info: {
            ...emptyOas.info,
            termsOfService: "https://example.com/terms",
          },
        },
      });

      expect(screen.getByRole("textbox", { name: /^terms of service/i })).toHaveValue(
        "https://example.com/terms"
      );
    });
  });

  describe("External Docs (Technical Profile)", () => {
    it("should not show externalDocs in Basic or Advanced profile", () => {
      renderWithProvider({ profile: "Advanced" });

      expect(screen.queryByRole("textbox", { name: /^external docs url/i })).not.toBeInTheDocument();
    });

    it("should show externalDocs in Technical profile", () => {
      renderWithProvider({ profile: "Technical" });

      expect(screen.getByRole("textbox", { name: /^external docs url/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /^external docs description/i })).toBeInTheDocument();
    });

    it("should display existing externalDocs values", () => {
      renderWithProvider({
        profile: "Technical",
        oasData: {
          ...emptyOas,
          externalDocs: {
            url: "https://docs.example.com",
            description: "Full API documentation",
          },
        },
      });

      expect(screen.getByRole("textbox", { name: /^external docs url/i })).toHaveValue(
        "https://docs.example.com"
      );
      expect(screen.getByRole("textbox", { name: /^external docs description/i })).toHaveValue(
        "Full API documentation"
      );
    });
  });

  describe("Help Tooltips", () => {
    it("should have help tooltip on title field", () => {
      renderWithProvider();

      const helpIcon = screen.getAllByTestId("help-icon")[0];
      expect(helpIcon).toBeInTheDocument();
    });

    it("should have help tooltip on version field", () => {
      renderWithProvider();

      // Should have multiple help icons for different fields
      const helpIcons = screen.getAllByTestId("help-icon");
      expect(helpIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Field Validation", () => {
    it("should show error for empty title", async () => {
      renderWithProvider({
        oasData: {
          ...emptyOas,
          info: { ...emptyOas.info, title: "" },
        },
        errors: [{ path: "/info/title", message: "Title is required", type: "error" }],
      });

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });

    it("should show error for invalid version format", async () => {
      renderWithProvider({
        errors: [
          { path: "/info/version", message: "Invalid version format", type: "error" },
        ],
      });

      expect(screen.getByText(/invalid version format/i)).toBeInTheDocument();
    });

    it("should show error for invalid server URL", async () => {
      renderWithProvider({
        errors: [
          { path: "/servers/0/url", message: "Invalid URL format", type: "error" },
        ],
      });

      expect(screen.getByText(/invalid url format/i)).toBeInTheDocument();
    });
  });

  describe("Edit Tracking", () => {
    it("should highlight edited fields", () => {
      renderWithProvider({
        editedPaths: new Set(["/info/title"]),
        oasData: {
          ...emptyOas,
          info: { ...emptyOas.info, title: "Edited Title" },
        },
      });

      // The field container should have edit highlight class
      const titleField = screen.getByRole("textbox", { name: /^title/i });
      const container = titleField.closest("[data-testid='form-field-container']");
      expect(container).toHaveClass("bg-amber-50");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /api information/i })).toBeInTheDocument();
    });

    it("should group related fields in fieldsets", () => {
      renderWithProvider({ profile: "Advanced" });

      // Contact and license should be in fieldsets
      expect(screen.getByRole("group", { name: /contact/i })).toBeInTheDocument();
      expect(screen.getByRole("group", { name: /license/i })).toBeInTheDocument();
    });

    it("should have proper labels for all inputs", () => {
      renderWithProvider({ profile: "Expert" });

      // All inputs should be accessible by label
      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName();
      });
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const tab = container.querySelector("[data-testid='api-info-tab']");
      expect(tab).toHaveClass("space-y-6");
    });

    it("should render in a single column by default", () => {
      const { container } = renderWithProvider();

      const tab = container.querySelector("[data-testid='api-info-tab']");
      expect(tab).toBeInTheDocument();
    });
  });
});
