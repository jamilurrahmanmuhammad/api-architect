# Form-Based API Builder Components

This directory contains React components for the form-based OpenAPI specification builder.

## Overview

The Form-Based API Builder provides a user-friendly interface for creating and editing OpenAPI specifications without writing YAML/JSON directly. It supports multiple profile levels for different user expertise.

## Components

### Core Components

| Component | Description |
|-----------|-------------|
| `FormStateProvider` | Context provider managing form state, undo/redo, validation |
| `FormField` | Reusable form input with validation and help tooltips |
| `ProfileGate` | Conditional rendering based on user profile level |

### Tab Components

| Component | Description |
|-----------|-------------|
| `ApiInfoTab` | Edit API info (title, version, description, servers) |
| `ModelsTab` | Manage schemas/models with field editing |
| `OperationsTab` | Edit API operations/endpoints |
| `FieldEditor` | Edit schema properties with type selection |
| `ParametersEditor` | Edit operation parameters |
| `RequestResponseEditor` | Edit request/response bodies |
| `SecurityTab` | Manage security schemes |
| `ExportTab` | Export options and OAS preview |

### Import/Export Components

| Component | Description |
|-----------|-------------|
| `OASImportDialog` | Import OpenAPI specs (JSON/YAML) |
| `CSVImportDialog` | Import operations from CSV |
| `CSVExportFlow` | Export operations to CSV |
| `PDFExportFlow` | Generate PDF documentation |
| `MergeConflictDialog` | Resolve import conflicts |
| `ImportSummary` | Show import results with undo |

### UI Components

| Component | Description |
|-----------|-------------|
| `ProfileSelector` | Select user profile level |
| `ValidationPanel` | Real-time validation feedback |
| `OASViewer` | JSON/YAML viewer with syntax highlighting |
| `UndoRedoButtons` | Undo/redo with keyboard shortcuts |
| `SaveIndicator` | Auto-save status indicator |

## Profile Levels

| Profile | Target User | Visible Fields |
|---------|-------------|----------------|
| Basic | Business analysts | Title, version, description, basic operations |
| Advanced | API designers | + Contact, license, tags, parameters |
| Technical | Developers | + Schemas, composition, security |
| Expert | API architects | All fields including vendor extensions |

## Usage

```tsx
import { FormStateProvider, ApiInfoTab, ModelsTab } from "@/components/forms";

function ApiBuilder() {
  return (
    <FormStateProvider>
      <ApiInfoTab />
      <ModelsTab />
    </FormStateProvider>
  );
}
```

## State Management

The `FormStateProvider` manages:
- OAS data structure
- Undo/redo stack (20 levels)
- Validation errors
- Edited field tracking
- Profile level
- Auto-save status

Access state with hooks:
```tsx
const { state, dispatch } = useFormState();
const updateField = useUpdateField();

// Update a field
updateField("/info/title", "My API");

// Undo/redo
dispatch({ type: "UNDO" });
dispatch({ type: "REDO" });
```

## Testing

Components include comprehensive unit tests:
```bash
npm run test -- tests/unit/components/
```

Performance benchmarks:
```bash
npm run test -- tests/performance/
```

E2E tests (requires Playwright):
```bash
npx playwright test tests/e2e/api-builder.spec.ts
```

## Architecture

```
forms/
├── index.ts              # Public exports
├── FormField.tsx         # Base input component
├── ProfileGate.tsx       # Conditional rendering
├── tabs/                 # Tab components
│   ├── ApiInfoTab.tsx
│   ├── ModelsTab.tsx
│   ├── OperationsTab.tsx
│   └── ...
├── OASImportDialog.tsx   # Import dialogs
├── CSVImportDialog.tsx
├── CSVExportFlow.tsx     # Export flows
├── PDFExportFlow.tsx
├── MergeConflictDialog.tsx
├── ImportSummary.tsx
├── ProfileSelector.tsx   # UI components
├── ValidationPanel.tsx
├── OASViewer.tsx
├── UndoRedoButtons.tsx
└── SaveIndicator.tsx
```

## Dependencies

- React 18+
- Radix UI (Dialog, Tabs)
- Lucide React (icons)
- js-yaml (YAML parsing)
- Tailwind CSS (styling)
