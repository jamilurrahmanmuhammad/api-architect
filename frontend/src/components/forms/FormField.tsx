/**
 * FormField Component
 * Reusable form field with support for multiple input types,
 * validation display, help tooltips, and accessibility features
 */

import React, { forwardRef, useId } from "react";
import { HelpCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldProps {
  /** Unique field name/id */
  name: string;
  /** Field label text */
  label: string;
  /** Current field value */
  value?: string | number | null;
  /** Change handler */
  onChange: (value: string | number) => void;
  /** Input type */
  type?: "text" | "textarea" | "select" | "number" | "email" | "url";
  /** Options for select type */
  options?: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Help tooltip text */
  helpText?: string;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is required */
  required?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Whether textarea is resizable */
  resizable?: boolean;
  /** Minimum value for number input */
  min?: number;
  /** Maximum value for number input */
  max?: number;
  /** Step value for number input */
  step?: number;
  /** OAS path for integration with FormStateProvider */
  path?: string;
  /** Whether field has been edited */
  isEdited?: boolean;
  /** Hide the visible label (still accessible) */
  hideLabel?: boolean;
  /** Custom aria-label */
  "aria-label"?: string;
  /** Custom aria-describedby */
  "aria-describedby"?: string;
  /** Custom container className */
  className?: string;
  /** Custom input className */
  inputClassName?: string;
  /** Custom label className */
  labelClassName?: string;
}

/**
 * FormField component for rendering various input types with
 * consistent styling, validation, and accessibility
 */
export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(function FormField(
  {
    name,
    label,
    value,
    onChange,
    type = "text",
    options = [],
    placeholder,
    error,
    helpText,
    disabled = false,
    required = false,
    rows = 3,
    resizable = true,
    min,
    max,
    step,
    path,
    isEdited = false,
    hideLabel = false,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    className,
    inputClassName,
    labelClassName,
  },
  ref
) {
  const generatedId = useId();
  const fieldId = name || generatedId;
  const errorId = `${fieldId}-error`;

  // Normalize value for display
  const displayValue = value ?? "";

  // Build aria-describedby from props and error state
  const describedByIds: string[] = [];
  if (ariaDescribedBy) {
    describedByIds.push(ariaDescribedBy);
  }
  if (error) {
    describedByIds.push(errorId);
  }
  const finalAriaDescribedBy =
    describedByIds.length > 0 ? describedByIds.join(" ") : undefined;

  // Handle value changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const newValue = e.target.value;
    if (type === "number") {
      // Convert to number for number inputs
      const numValue = newValue === "" ? 0 : parseFloat(newValue);
      onChange(isNaN(numValue) ? 0 : numValue);
    } else {
      onChange(newValue);
    }
  };

  // Common input props
  const commonProps = {
    id: fieldId,
    name: fieldId,
    disabled,
    required,
    "aria-invalid": !!error,
    "aria-required": required || undefined,
    "aria-describedby": finalAriaDescribedBy,
    "data-path": path,
    ...(hideLabel && ariaLabel ? { "aria-label": ariaLabel } : {}),
  };

  // Input error styling
  const errorInputClass = error ? "border-destructive" : "";

  // Render the input element based on type
  const renderInput = () => {
    switch (type) {
      case "textarea":
        return (
          <textarea
            {...commonProps}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            value={String(displayValue)}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              !resizable && "resize-none",
              errorInputClass,
              inputClassName
            )}
          />
        );

      case "select":
        return (
          <select
            {...commonProps}
            ref={ref as React.Ref<HTMLSelectElement>}
            value={String(displayValue)}
            onChange={handleChange}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errorInputClass,
              inputClassName
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "number":
        return (
          <Input
            {...commonProps}
            ref={ref as React.Ref<HTMLInputElement>}
            type="number"
            value={displayValue === "" ? "" : String(displayValue)}
            onChange={handleChange}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={cn(errorInputClass, inputClassName)}
          />
        );

      case "email":
      case "url":
        return (
          <Input
            {...commonProps}
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            value={String(displayValue)}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(errorInputClass, inputClassName)}
          />
        );

      default:
        // text input
        return (
          <Input
            {...commonProps}
            ref={ref as React.Ref<HTMLInputElement>}
            type="text"
            value={String(displayValue)}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(errorInputClass, inputClassName)}
          />
        );
    }
  };

  return (
    <div
      data-testid="form-field-container"
      className={cn(
        "space-y-2",
        isEdited && "bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md -m-2",
        className
      )}
    >
      {/* Label row with help tooltip */}
      <div className="flex items-center gap-1">
        <label
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            hideLabel && "sr-only",
            labelClassName
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {/* Help tooltip */}
        {helpText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-testid="help-icon"
                tabIndex={0}
                aria-label={`Help for ${label}`}
                className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{helpText}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Input element */}
      {renderInput()}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span id={errorId}>{error}</span>
        </div>
      )}
    </div>
  );
});

export default FormField;
