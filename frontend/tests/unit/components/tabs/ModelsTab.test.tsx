/**
 * Component Tests for ModelsTab
 * Tests Models/Schema editor tab with list, add, edit, delete functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { ModelsTab } from "../../../../src/components/forms/tabs/ModelsTab";
import { FormStateProvider } from "../../../../src/providers/FormStateProvider";
import { initialFormState, FormState, emptyOas } from "../../../../src/types/formState";

/**
 * Helper to render ModelsTab within FormStateProvider
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
      {ui || <ModelsTab />}
    </FormStateProvider>
  );
}

/**
 * Sample OAS data with schemas for testing
 */
const sampleOasWithSchemas = {
  ...emptyOas,
  components: {
    schemas: {
      Pet: {
        type: "object",
        description: "A pet in the store",
        properties: {
          id: { type: "integer", format: "int64" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
      User: {
        type: "object",
        description: "A user account",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          username: { type: "string" },
        },
      },
      Order: {
        type: "object",
        description: "An order for a pet",
        properties: {
          id: { type: "integer" },
          petId: { type: "integer" },
          quantity: { type: "integer" },
        },
      },
    },
  },
};

describe("ModelsTab", () => {
  describe("Model List", () => {
    it("should render models section", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /models/i })).toBeInTheDocument();
    });

    it("should display list of existing models", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      expect(screen.getByText("Pet")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Order")).toBeInTheDocument();
    });

    it("should display model descriptions", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      expect(screen.getByText("A pet in the store")).toBeInTheDocument();
      expect(screen.getByText("A user account")).toBeInTheDocument();
    });

    it("should show empty state when no models", () => {
      renderWithProvider({
        oasData: { ...emptyOas, components: { schemas: {} } },
      });

      expect(screen.getByText(/no models defined/i)).toBeInTheDocument();
    });

    it("should display model count", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      expect(screen.getByText(/3 models/i)).toBeInTheDocument();
    });
  });

  describe("Add Model", () => {
    it("should render add model button", () => {
      renderWithProvider();

      expect(screen.getByRole("button", { name: /add model/i })).toBeInTheDocument();
    });

    it("should show add model dialog when button clicked", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/new model/i)).toBeInTheDocument();
    });

    it("should have name input in add dialog", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      expect(screen.getByRole("textbox", { name: /model name/i })).toBeInTheDocument();
    });

    it("should add new model when form submitted", async () => {
      renderWithProvider({ oasData: { ...emptyOas, components: { schemas: {} } } });

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByRole("textbox", { name: /model name/i });
      await userEvent.type(nameInput, "NewModel");

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      // Dialog should close and new model should appear
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("NewModel")).toBeInTheDocument();
    });

    it("should validate model name is unique", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      const nameInput = screen.getByRole("textbox", { name: /model name/i });
      await userEvent.type(nameInput, "Pet");

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      // Should show error for duplicate name
      expect(screen.getByText(/model.*already exists/i)).toBeInTheDocument();
    });

    it("should validate model name is not empty", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      const createButton = screen.getByRole("button", { name: /create/i });
      await userEvent.click(createButton);

      expect(screen.getByText(/model name is required/i)).toBeInTheDocument();
    });

    it("should close dialog when cancel clicked", async () => {
      renderWithProvider();

      const addButton = screen.getByRole("button", { name: /add model/i });
      await userEvent.click(addButton);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Model Selection and Editing", () => {
    it("should allow selecting a model", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const petModel = screen.getByRole("button", { name: /select pet model/i });
      await userEvent.click(petModel);

      // Model should be marked as selected
      expect(petModel).toHaveAttribute("aria-selected", "true");
    });

    it("should show model details when selected", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const petModel = screen.getByRole("button", { name: /select pet model/i });
      await userEvent.click(petModel);

      // Should show editable name and description
      expect(screen.getByRole("textbox", { name: /model name/i })).toHaveValue("Pet");
    });

    it("should allow editing model name", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const petModel = screen.getByRole("button", { name: /select pet model/i });
      await userEvent.click(petModel);

      const nameInput = screen.getByRole("textbox", { name: /model name/i });
      fireEvent.change(nameInput, { target: { value: "Animal" } });

      // Name should be updated
      expect(nameInput).toHaveValue("Animal");
    });

    it("should allow editing model description", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const petModel = screen.getByRole("button", { name: /select pet model/i });
      await userEvent.click(petModel);

      const descInput = screen.getByRole("textbox", { name: /description/i });
      fireEvent.change(descInput, { target: { value: "An animal companion" } });

      expect(descInput).toHaveValue("An animal companion");
    });
  });

  describe("Delete Model", () => {
    it("should render delete button for each model", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const deleteButtons = screen.getAllByRole("button", { name: /delete.*model/i });
      expect(deleteButtons.length).toBe(3);
    });

    it("should show confirmation dialog when delete clicked", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const deleteButtons = screen.getAllByRole("button", { name: /delete.*model/i });
      await userEvent.click(deleteButtons[0]);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("should show model name in delete confirmation", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      // Delete Pet model (first in alphabetical order after Order)
      const deletePetButton = screen.getByRole("button", { name: /delete pet model/i });
      await userEvent.click(deletePetButton);

      // Model name should appear in confirmation dialog (in strong tag)
      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByText("Pet")).toBeInTheDocument();
    });

    it("should delete model when confirmed", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      // Delete Pet model
      const deletePetButton = screen.getByRole("button", { name: /delete pet model/i });
      await userEvent.click(deletePetButton);

      // Click the Delete button in the dialog (not the cancel one)
      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
      await userEvent.click(confirmButton);

      // Pet should no longer be in the list
      expect(screen.queryByRole("button", { name: /select pet model/i })).not.toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("should close dialog without deleting when cancelled", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const deleteButtons = screen.getAllByRole("button", { name: /delete.*model/i });
      await userEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByText("Pet")).toBeInTheDocument();
    });

    it("should warn about references when deleting model that is used", async () => {
      const oasWithRefs = {
        ...sampleOasWithSchemas,
        paths: {
          "/pets": {
            get: {
              responses: {
                "200": {
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      renderWithProvider({ oasData: oasWithRefs });

      const deletePetButton = screen.getByRole("button", { name: /delete pet model/i });
      await userEvent.click(deletePetButton);

      // Should show warning about references
      expect(screen.getByText(/used by.*endpoint/i)).toBeInTheDocument();
    });
  });

  describe("Search and Filter", () => {
    it("should render search input", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      expect(screen.getByRole("searchbox", { name: /search models/i })).toBeInTheDocument();
    });

    it("should filter models by name", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const searchInput = screen.getByRole("searchbox", { name: /search models/i });
      // Use "User" instead of "Pet" because "pet" appears in Order's description
      fireEvent.change(searchInput, { target: { value: "User" } });

      // Only User model should be visible
      expect(screen.queryByRole("button", { name: /select pet model/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /select user model/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /select order model/i })).not.toBeInTheDocument();
    });

    it("should filter models by description", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const searchInput = screen.getByRole("searchbox", { name: /search models/i });
      await userEvent.type(searchInput, "account");

      expect(screen.queryByText("Pet")).not.toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("should show no results message when filter matches nothing", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const searchInput = screen.getByRole("searchbox", { name: /search models/i });
      await userEvent.type(searchInput, "xyz123");

      expect(screen.getByText(/no models match/i)).toBeInTheDocument();
    });

    it("should clear filter when X clicked", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const searchInput = screen.getByRole("searchbox", { name: /search models/i });
      await userEvent.type(searchInput, "Pet");

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await userEvent.click(clearButton);

      expect(screen.getByText("Pet")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Order")).toBeInTheDocument();
    });
  });

  describe("Model Type Display", () => {
    it("should show model type (object)", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const typeLabels = screen.getAllByText(/object/i);
      expect(typeLabels.length).toBeGreaterThan(0);
    });

    it("should show field count for models", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      // Pet has 2 properties, User has 3, Order has 3
      // Should find at least one "2 fields" and "3 fields" entries
      const fieldCounts = screen.getAllByText(/\d+ fields/i);
      expect(fieldCounts.length).toBe(3); // One for each model
      expect(screen.getByText("2 fields")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      renderWithProvider();

      expect(screen.getByRole("heading", { name: /models/i })).toBeInTheDocument();
    });

    it("should have accessible model list", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      expect(screen.getByRole("list", { name: /models list/i })).toBeInTheDocument();
    });

    it("should have accessible search", () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      const searchInput = screen.getByRole("searchbox", { name: /search models/i });
      expect(searchInput).toHaveAttribute("aria-label");
    });
  });

  describe("Layout", () => {
    it("should render with proper spacing", () => {
      const { container } = renderWithProvider();

      const tab = container.querySelector("[data-testid='models-tab']");
      expect(tab).toHaveClass("space-y-6");
    });

    it("should show model list and details side by side on large screens", () => {
      const { container } = renderWithProvider({ oasData: sampleOasWithSchemas });

      const layout = container.querySelector("[data-testid='models-layout']");
      expect(layout).toHaveClass("grid");
    });
  });

  describe("Edit Tracking", () => {
    it("should mark modified models as edited", async () => {
      renderWithProvider({ oasData: sampleOasWithSchemas });

      // Select and edit Pet model
      const petModel = screen.getByRole("button", { name: /select pet model/i });
      await userEvent.click(petModel);

      const descInput = screen.getByRole("textbox", { name: /description/i });
      fireEvent.change(descInput, { target: { value: "Modified description" } });

      // Pet model should show edited indicator
      expect(screen.getByTestId("model-edited-indicator-Pet")).toBeInTheDocument();
    });
  });
});
