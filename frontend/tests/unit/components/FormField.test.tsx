/**
 * Component Tests for FormField
 * Tests reusable form field component with multiple input types
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField, FormFieldProps } from "../../../src/components/forms/FormField";

describe("FormField", () => {
  const defaultProps: FormFieldProps = {
    name: "test-field",
    label: "Test Field",
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Text Input", () => {
    it("should render text input by default", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "text");
    });

    it("should render with label", () => {
      render(<FormField {...defaultProps} />);

      const label = screen.getByText("Test Field");
      expect(label).toBeInTheDocument();
    });

    it("should associate label with input via htmlFor", () => {
      render(<FormField {...defaultProps} />);

      const label = screen.getByText("Test Field");
      const input = screen.getByRole("textbox");

      expect(label).toHaveAttribute("for", "test-field");
      expect(input).toHaveAttribute("id", "test-field");
    });

    it("should display current value", () => {
      render(<FormField {...defaultProps} value="Hello World" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Hello World");
    });

    it("should call onChange when value changes", async () => {
      const onChange = vi.fn();
      render(<FormField {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await userEvent.type(input, "New Value");

      expect(onChange).toHaveBeenCalled();
    });

    it("should pass the new value to onChange", async () => {
      const onChange = vi.fn();
      render(<FormField {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test Input" } });

      expect(onChange).toHaveBeenCalledWith("Test Input");
    });

    it("should render placeholder text", () => {
      render(<FormField {...defaultProps} placeholder="Enter value..." />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "Enter value...");
    });

    it("should be disabled when disabled prop is true", () => {
      render(<FormField {...defaultProps} disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("should be required when required prop is true", () => {
      render(<FormField {...defaultProps} required />);

      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });
  });

  describe("Textarea", () => {
    it("should render textarea when type is textarea", () => {
      render(<FormField {...defaultProps} type="textarea" />);

      const textarea = screen.getByRole("textbox");
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("should display value in textarea", () => {
      render(
        <FormField
          {...defaultProps}
          type="textarea"
          value="Long description text"
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Long description text");
    });

    it("should call onChange when textarea value changes", async () => {
      const onChange = vi.fn();
      render(<FormField {...defaultProps} type="textarea" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "Updated description" } });

      expect(onChange).toHaveBeenCalledWith("Updated description");
    });

    it("should render with custom rows", () => {
      render(<FormField {...defaultProps} type="textarea" rows={5} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "5");
    });

    it("should apply resize-none class for fixed height", () => {
      render(<FormField {...defaultProps} type="textarea" resizable={false} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveClass("resize-none");
    });
  });

  describe("Select Dropdown", () => {
    const selectOptions = [
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2" },
      { value: "option3", label: "Option 3" },
    ];

    it("should render select when type is select", () => {
      render(
        <FormField {...defaultProps} type="select" options={selectOptions} />
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });

    it("should render all options", () => {
      render(
        <FormField {...defaultProps} type="select" options={selectOptions} />
      );

      const options = screen.getAllByRole("option");
      // +1 for placeholder option if value is empty
      expect(options.length).toBeGreaterThanOrEqual(3);
    });

    it("should display selected value", () => {
      render(
        <FormField
          {...defaultProps}
          type="select"
          options={selectOptions}
          value="option2"
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("option2");
    });

    it("should call onChange when selection changes", async () => {
      const onChange = vi.fn();
      render(
        <FormField
          {...defaultProps}
          type="select"
          options={selectOptions}
          onChange={onChange}
        />
      );

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "option3");

      expect(onChange).toHaveBeenCalledWith("option3");
    });

    it("should render placeholder option when provided", () => {
      render(
        <FormField
          {...defaultProps}
          type="select"
          options={selectOptions}
          placeholder="Select an option..."
        />
      );

      const placeholder = screen.getByText("Select an option...");
      expect(placeholder).toBeInTheDocument();
    });

    it("should disable placeholder option", () => {
      render(
        <FormField
          {...defaultProps}
          type="select"
          options={selectOptions}
          placeholder="Select an option..."
        />
      );

      const placeholder = screen.getByText("Select an option...");
      expect(placeholder).toBeDisabled();
    });
  });

  describe("Validation Error Display", () => {
    it("should display error message when error prop is provided", () => {
      render(<FormField {...defaultProps} error="This field is required" />);

      const errorMessage = screen.getByText("This field is required");
      expect(errorMessage).toBeInTheDocument();
    });

    it("should apply error styling to input when error is present", () => {
      render(<FormField {...defaultProps} error="Invalid input" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should associate error message with input via aria-describedby", () => {
      render(<FormField {...defaultProps} error="Error message" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "test-field-error");

      const errorMessage = screen.getByText("Error message");
      expect(errorMessage).toHaveAttribute("id", "test-field-error");
    });

    it("should display error icon with error message", () => {
      render(<FormField {...defaultProps} error="Field error" />);

      const errorContainer = screen.getByRole("alert");
      expect(errorContainer).toBeInTheDocument();
    });

    it("should not display error when error prop is empty", () => {
      render(<FormField {...defaultProps} error="" />);

      const errorMessage = screen.queryByRole("alert");
      expect(errorMessage).not.toBeInTheDocument();
    });

    it("should apply error border class to input", () => {
      render(<FormField {...defaultProps} error="Has error" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-destructive");
    });
  });

  describe("Help Tooltip", () => {
    it("should render help icon when helpText is provided", () => {
      render(<FormField {...defaultProps} helpText="This is helpful info" />);

      const helpIcon = screen.getByTestId("help-icon");
      expect(helpIcon).toBeInTheDocument();
    });

    it("should not render help icon when helpText is not provided", () => {
      render(<FormField {...defaultProps} />);

      const helpIcon = screen.queryByTestId("help-icon");
      expect(helpIcon).not.toBeInTheDocument();
    });

    it("should have tooltip trigger with help text data", () => {
      // Note: Radix UI tooltips use portals which require special handling in tests.
      // We verify the tooltip trigger is properly configured.
      render(<FormField {...defaultProps} helpText="Help text content" />);

      const helpIcon = screen.getByTestId("help-icon");
      // The trigger should be a button that can show the tooltip
      expect(helpIcon.tagName).toBe("BUTTON");
      expect(helpIcon).toHaveAttribute("type", "button");
    });

    it("should configure tooltip trigger for keyboard accessibility", () => {
      render(<FormField {...defaultProps} helpText="Help text content" />);

      const helpIcon = screen.getByTestId("help-icon");
      // Tooltip triggers should be focusable for keyboard users
      expect(helpIcon).toHaveAttribute("tabindex", "0");
      expect(helpIcon).toHaveAttribute("aria-label", "Help for Test Field");
    });

    it("should be accessible via keyboard (tabbing to help icon)", async () => {
      render(<FormField {...defaultProps} helpText="Keyboard accessible help" />);

      const helpIcon = screen.getByTestId("help-icon");
      expect(helpIcon).toHaveAttribute("tabindex", "0");
    });

    it("should have aria-label for screen readers", () => {
      render(<FormField {...defaultProps} helpText="Screen reader help" />);

      const helpIcon = screen.getByTestId("help-icon");
      expect(helpIcon).toHaveAttribute("aria-label", "Help for Test Field");
    });
  });

  describe("Accessibility", () => {
    it("should have proper label association", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByLabelText("Test Field");
      expect(input).toBeInTheDocument();
    });

    it("should support aria-label when hideLabel is true", () => {
      render(<FormField {...defaultProps} hideLabel aria-label="Hidden label field" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-label", "Hidden label field");
    });

    it("should visually hide label when hideLabel is true", () => {
      render(<FormField {...defaultProps} hideLabel />);

      const label = screen.getByText("Test Field");
      expect(label).toHaveClass("sr-only");
    });

    it("should support custom aria-describedby", () => {
      render(
        <FormField {...defaultProps} aria-describedby="custom-description" />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "custom-description");
    });

    it("should combine aria-describedby with error", () => {
      render(
        <FormField
          {...defaultProps}
          error="Error message"
          aria-describedby="custom-description"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute(
        "aria-describedby",
        "custom-description test-field-error"
      );
    });

    it("should have proper focus styling", () => {
      render(<FormField {...defaultProps} />);

      const input = screen.getByRole("textbox");
      // Focus visible styles are applied via Tailwind CSS
      expect(input.className).toMatch(/focus/);
    });

    it("should indicate required field with aria-required", () => {
      render(<FormField {...defaultProps} required />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-required", "true");
    });

    it("should show required indicator in label", () => {
      render(<FormField {...defaultProps} required />);

      const requiredIndicator = screen.getByText("*");
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveClass("text-destructive");
    });
  });

  describe("Integration with FormStateProvider", () => {
    it("should accept path prop for OAS field updates", () => {
      render(<FormField {...defaultProps} path="/info/title" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("data-path", "/info/title");
    });

    it("should highlight edited fields", () => {
      render(<FormField {...defaultProps} isEdited />);

      const fieldContainer = screen.getByTestId("form-field-container");
      expect(fieldContainer).toHaveClass("bg-amber-50");
    });

    it("should not highlight unedited fields", () => {
      render(<FormField {...defaultProps} isEdited={false} />);

      const fieldContainer = screen.getByTestId("form-field-container");
      expect(fieldContainer).not.toHaveClass("bg-amber-50");
    });
  });

  describe("Number Input", () => {
    it("should render number input when type is number", () => {
      render(<FormField {...defaultProps} type="number" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("type", "number");
    });

    it("should accept min and max constraints", () => {
      render(<FormField {...defaultProps} type="number" min={0} max={100} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("should accept step constraint", () => {
      render(<FormField {...defaultProps} type="number" step={0.1} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("step", "0.1");
    });

    it("should call onChange with number value", () => {
      const onChange = vi.fn();
      render(<FormField {...defaultProps} type="number" onChange={onChange} />);

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "42" } });

      expect(onChange).toHaveBeenCalledWith(42);
    });
  });

  describe("Email Input", () => {
    it("should render email input when type is email", () => {
      render(<FormField {...defaultProps} type="email" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });
  });

  describe("URL Input", () => {
    it("should render url input when type is url", () => {
      render(<FormField {...defaultProps} type="url" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "url");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className to container", () => {
      render(<FormField {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId("form-field-container");
      expect(container).toHaveClass("custom-class");
    });

    it("should apply inputClassName to input element", () => {
      render(<FormField {...defaultProps} inputClassName="input-custom" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("input-custom");
    });

    it("should apply labelClassName to label element", () => {
      render(<FormField {...defaultProps} labelClassName="label-custom" />);

      const label = screen.getByText("Test Field");
      expect(label).toHaveClass("label-custom");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined value gracefully", () => {
      render(<FormField {...defaultProps} value={undefined} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("should handle null value gracefully", () => {
      render(<FormField {...defaultProps} value={null as any} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("should handle special characters in value", () => {
      render(<FormField {...defaultProps} value="<script>alert('xss')</script>" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("<script>alert('xss')</script>");
    });

    it("should handle very long text in textarea", () => {
      const longText = "A".repeat(10000);
      render(<FormField {...defaultProps} type="textarea" value={longText} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue(longText);
    });

    it("should handle empty options array for select", () => {
      render(<FormField {...defaultProps} type="select" options={[]} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });
  });
});
