# Feature 002 Testing Guide - Requirements Grammar Authoring Studio

## Overview

Feature 002 is the **Requirements Grammar Authoring Studio**, a text-first DSL editor that enables requirements engineers to author API specifications in a readable, domain-specific language. This guide covers how to test each core feature when implemented.

---

## Current Status

The system currently has:
- ✅ **Phase 1**: Core Framework & Professional Homepage (fully implemented)
  - Landing page, navigation, theme toggle, modules
  - Authentication system with mock credentials
  - Dashboard with module cards

- ⏳ **Phase 2**: Requirements Grammar Authoring Studio (to be implemented)
  - DSL Editor component (NOT YET IMPLEMENTED)
  - Parser/Validator service (NOT YET IMPLEMENTED)
  - Preview pane (NOT YET IMPLEMENTED)
  - File CRUD operations (NOT YET IMPLEMENTED)

---

## Testing Roadmap

### Story 1: Author Requirements in Plain Text DSL (P1)

**Feature:** Users can write API specifications in a plain-text DSL format

**How to Test When Implemented:**

#### Test 1.1: Open Editor with Empty File
```
Steps:
1. Navigate to http://localhost:5175/app/api-design
2. Click "New File" or "Create Requirement"
3. Verify empty editor appears with cursor ready

Expected:
- Text editor is visible and focused
- No syntax errors shown
- Editor accepts typing immediately
```

#### Test 1.2: Type Valid DSL Syntax
```
Steps:
1. In the empty editor, type the following DSL:

---
service:
  name: "Pet Store API"
  version: "1.0.0"
  baseUrl: "/api/v1"

model:
  name: "Pet"
  fields:
    - name: "id"
      type: "string"
    - name: "name"
      type: "string"
    - name: "status"
      type: "string"

operation:
  name: "listPets"
  method: "GET"
  path: "/pets"
  response: "Pet"

operation:
  name: "createPet"
  method: "POST"
  path: "/pets"
  request: "Pet"
  response: "Pet"

error:
  status: 404
  name: "NotFound"
  message: "Pet not found"
---

2. Verify no red squiggles or error icons appear
3. Verify the editor shows the content correctly formatted
```

#### Test 1.3: Save and Reload File
```
Steps:
1. With content in the editor, press Ctrl+S (or click Save)
2. Enter a filename: "pet-store-api.req"
3. Click "Save"
4. Navigate away from the editor
5. Return to the file list and open "pet-store-api.req"

Expected:
- File is saved with no errors
- File can be reopened with identical content
- No data loss occurs
```

#### Test 1.4: Handle Unsaved Changes
```
Steps:
1. Open a file and make changes
2. Click on a different module in the sidebar
3. If there are unsaved changes, you should be prompted

Expected:
- Dialog appears asking "You have unsaved changes. Save before leaving?"
- Options: Save, Discard, Cancel
- If Save: file is saved before navigating
- If Discard: changes are lost and navigation proceeds
- If Cancel: stay on current file
```

---

### Story 2: Real-Time Syntax Highlighting & Validation (P1)

**Feature:** Users get immediate visual feedback on DSL syntax and errors

**How to Test When Implemented:**

#### Test 2.1: Syntax Highlighting
```
Steps:
1. Open the editor with a DSL file
2. Look at the text and verify keywords are colored

Expected Colors (example):
- Keywords (service, model, operation, error): Blue
- Strings (values in quotes): Green
- Colons (:): Default text color
- Numbers: Orange/Yellow
- Comments (#): Gray

Example:
  # This is a comment          <- Gray
  service:                      <- Blue keyword, blue colon
    name: "Pet Store API"       <- Blue keyword, green string
    version: "1.0.0"            <- Blue keyword, green string
    baseUrl: "/api/v1"          <- Blue keyword, green string
```

#### Test 2.2: Real-Time Error Detection
```
Steps:
1. Open editor and type invalid DSL:

   service
     name: "Incomplete"

2. Notice the missing colon after "service"
3. Verify a red squiggle appears under "service"

Expected:
- Red error indicator on line with the mistake
- Error appears within 500ms of typing
```

#### Test 2.3: Error Message on Hover
```
Steps:
1. Type invalid DSL with an error
2. Hover mouse over the red error squiggle

Expected:
- Tooltip appears with message like:
  "Missing ':' after 'service'. Expected format: service:"
- Or a sidebar error panel shows the error with line number
```

#### Test 2.4: Error Disappears on Fix
```
Steps:
1. Start with:
   service
     name: "API"

2. Add the missing colon:
   service:
     name: "API"

3. Observe the error indicator

Expected:
- Red squiggle disappears immediately
- No more error messages
```

---

### Story 3: Live Preview of Parsed Requirements (P1)

**Feature:** Users see structured preview of their DSL in real-time

**How to Test When Implemented:**

#### Test 3.1: Split-Pane Layout
```
Steps:
1. Open the editor
2. Look at the layout

Expected:
- Left side: Text editor with DSL
- Right side: Preview pane with parsed entities
- Adjustable divider in the middle (drag to resize)
```

#### Test 3.2: Real-Time Preview Updates
```
Steps:
1. Open editor with valid DSL containing:
   - 1 Service
   - 2 Models
   - 3 Operations
   - 1 Error

2. In the preview pane, verify it shows:
   - Service section with name, version, baseUrl
   - Models section listing both models with their fields
   - Operations section listing all 3 operations
   - Errors section showing the error

Expected:
- Preview updates within 1 second of making changes
- No lag between editing and preview updating
- All parsed entities visible and properly formatted
```

#### Test 3.3: Partial Preview During Invalid DSL
```
Steps:
1. Start with valid complete DSL
2. Add an incomplete section at the end:

   operation:
     name: "incomplete"
   (missing method and path)

3. Look at preview pane

Expected:
- Valid operations still show in preview
- Incomplete operation is either:
  a) Shown with missing fields marked as empty/required
  b) Not shown with error on that line
- Preview doesn't break; other valid entities still visible
```

#### Test 3.4: Bidirectional Selection
```
Steps:
1. In the preview pane, click on a model name (e.g., "Pet")
2. Observe the editor

Expected:
- Editor scrolls to the model definition
- The model section in editor is highlighted/selected

Steps (reverse):
1. In editor, select/highlight the "operation:" keyword and its block
2. Observe the preview pane

Expected:
- Preview pane highlights that operation in the Operations section
```

---

### Story 4: Autocomplete DSL Keywords (P2)

**Feature:** Users get intelligent suggestions as they type

**How to Test When Implemented:**

#### Test 4.1: Basic Autocomplete
```
Steps:
1. In the editor, type "ser"
2. Press Ctrl+Space (or autocomplete triggers automatically)

Expected:
- Dropdown appears with "service" as an option
- Dropdown also shows other keywords starting with 'se': operation, error, etc.
```

#### Test 4.2: Insert Suggestion
```
Steps:
1. Type "mod"
2. Autocomplete dropdown shows "model"
3. Press Tab or Enter to select it

Expected:
- "model" is inserted, replacing "mod"
- Autocomplete closes
- Cursor is positioned after "model"
```

#### Test 4.3: Context-Aware Autocomplete
```
Steps:
1. Type a valid service and model structure
2. Inside a model definition, type "fiel"
3. Trigger autocomplete

Expected:
- Suggestions show "fields" (model-specific)
- Keywords not applicable to models (e.g., "path", "method") are not shown
```

#### Test 4.4: Close Autocomplete
```
Steps:
1. Autocomplete dropdown is open
2. Press Escape key

Expected:
- Dropdown closes
- Text typed so far is preserved
- Can continue typing normally
```

---

### Story 5: Export Requirements to Standard Format (P2)

**Feature:** Users can export parsed requirements as JSON or YAML

**How to Test When Implemented:**

#### Test 5.1: Export Button
```
Steps:
1. Create a complete requirements file in the editor
2. Look for "Export" button (typically in toolbar or menu)
3. Click it

Expected:
- Dialog appears asking for export format
- Options: JSON, YAML (at least)
```

#### Test 5.2: Choose Format and Export
```
Steps:
1. Click Export
2. Format dialog shows
3. Select "JSON"
4. Click "Export" or "Download"

Expected:
- File download begins
- Downloaded file named something like "pet-store-api.json" or with timestamp
- Can be opened in text editor to verify content
```

#### Test 5.3: Verify Export Content
```
Steps:
1. Export requirements as JSON
2. Open the downloaded file in a text editor
3. Verify structure

Expected JSON structure should contain:
```json
{
  "services": [
    {
      "name": "Pet Store API",
      "version": "1.0.0",
      "baseUrl": "/api/v1"
    }
  ],
  "models": [
    {
      "name": "Pet",
      "fields": [
        { "name": "id", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "status", "type": "string" }
      ]
    }
  ],
  "operations": [
    {
      "name": "listPets",
      "method": "GET",
      "path": "/pets",
      "response": "Pet"
    }
  ],
  "errors": [
    {
      "status": 404,
      "name": "NotFound",
      "message": "Pet not found"
    }
  ]
}
```

#### Test 5.4: Export Fidelity
```
Steps:
1. Create requirements with special characters, Unicode, etc.
2. Export to JSON
3. Import/re-open the exported file (if import is available)
4. Compare original and re-imported

Expected:
- All data preserved exactly
- No loss of information
- Special characters properly encoded
```

---

## Example DSL Structures for Testing

### Minimal Valid Example
```yaml
---
service:
  name: "Simple API"
  version: "1.0"

model:
  name: "Item"
  fields:
    - name: "id"
      type: "string"

operation:
  name: "getItem"
  method: "GET"
  path: "/items/{id}"
  response: "Item"

error:
  status: 404
  name: "NotFound"
---
```

### Complete Example
```yaml
---
service:
  name: "Pet Store API"
  version: "1.0.0"
  baseUrl: "/api/v1"
  description: "A sample Pet Store API"

model:
  name: "Pet"
  description: "A pet in the store"
  fields:
    - name: "id"
      type: "string"
      required: true
    - name: "name"
      type: "string"
      required: true
    - name: "status"
      type: "string"
      enum: ["available", "pending", "sold"]

model:
  name: "Error"
  fields:
    - name: "code"
      type: "integer"
    - name: "message"
      type: "string"

operation:
  name: "listPets"
  method: "GET"
  path: "/pets"
  description: "List all pets"
  response: "Pet"

operation:
  name: "getPet"
  method: "GET"
  path: "/pets/{id}"
  response: "Pet"
  error: "NotFound"

operation:
  name: "createPet"
  method: "POST"
  path: "/pets"
  request: "Pet"
  response: "Pet"

operation:
  name: "updatePet"
  method: "PUT"
  path: "/pets/{id}"
  request: "Pet"
  response: "Pet"
  error: "NotFound"

operation:
  name: "deletePet"
  method: "DELETE"
  path: "/pets/{id}"
  error: "NotFound"

error:
  status: 400
  name: "BadRequest"
  message: "Invalid request parameters"

error:
  status: 404
  name: "NotFound"
  message: "Resource not found"

error:
  status: 500
  name: "InternalError"
  message: "Internal server error"
---
```

---

## Performance Testing

When the feature is implemented, test these performance metrics:

### Performance Targets (from Spec)
- **SC-002**: Syntax validation errors within 500ms of finishing a line
- **SC-003**: Preview pane updates within 1 second
- **SC-004**: Autocomplete suggestions within 200ms
- **SC-005**: 90% of valid DSL specifications parse successfully

### How to Test Performance

#### Test Large File (10,000 lines)
```
Steps:
1. Create a DSL file with ~10,000 lines
   (e.g., 1,000 models with 10 fields each)
2. Measure editor responsiveness
3. Type a character and measure:
   - Time to syntax highlighting update
   - Time to error detection
   - Preview update time

Expected:
- Editor remains responsive
- No freezing or lag
- Preview updates smoothly
```

#### Test Autocomplete Speed
```
Steps:
1. With a large file, type "ser"
2. Measure time from keystroke to dropdown appearance

Expected:
- Autocomplete appears within 200ms
```

---

## Acceptance Criteria Checklist

Use this checklist to verify Feature 002 is complete:

### Story 1: Plain Text Authoring
- [ ] User can type DSL syntax in editor
- [ ] Editor accepts input without errors
- [ ] User can save file with Ctrl+S
- [ ] Saved file can be reopened with identical content
- [ ] Unsaved changes trigger save prompt before navigation
- [ ] Multiple files can be created and switched between

### Story 2: Real-Time Syntax & Validation
- [ ] Keywords are highlighted with distinct colors
- [ ] Invalid syntax shows error within 500ms
- [ ] Red squiggle or error icon appears on error
- [ ] Hovering over error shows explanation tooltip
- [ ] Correcting error removes error indicator
- [ ] Error messages include line number

### Story 3: Live Preview
- [ ] Split-pane layout visible (editor left, preview right)
- [ ] Preview divider is adjustable by dragging
- [ ] Preview shows Services, Models, Operations, Errors sections
- [ ] Preview updates within 1 second of changes
- [ ] Partial preview works during incomplete edits
- [ ] Clicking preview entity highlights it in editor
- [ ] Selecting text in editor highlights related preview item

### Story 4: Autocomplete
- [ ] Typing keyword prefix triggers autocomplete dropdown
- [ ] Dropdown shows relevant suggestions
- [ ] Tab/Enter selects suggestion
- [ ] Context-aware suggestions work (e.g., model-specific)
- [ ] Escape closes dropdown without inserting
- [ ] Suggestions appear within 200ms

### Story 5: Export
- [ ] Export button visible in UI
- [ ] Export dialog allows format selection (JSON, YAML)
- [ ] Export downloads file with correct format
- [ ] Exported file contains all parsed entities
- [ ] Re-importing exported file preserves all data
- [ ] Special characters handled correctly in export

---

## Backend API Endpoints to Implement

For Feature 002, these endpoints will need to be available:

```
POST /api/v1/files
  - Create new DSL file
  - Payload: { name, content }
  - Returns: { id, name, content, createdAt, updatedAt }

GET /api/v1/files
  - List all DSL files
  - Returns: { files: [...], total, page, pageSize }

GET /api/v1/files/{fileId}
  - Get single DSL file
  - Returns: { id, name, content, createdAt, updatedAt }

PUT /api/v1/files/{fileId}
  - Update DSL file content
  - Payload: { content }
  - Returns: { id, name, content, updatedAt }

DELETE /api/v1/files/{fileId}
  - Delete DSL file
  - Returns: { message: "File deleted" }

POST /api/v1/parse
  - Parse DSL and return structured output
  - Payload: { content }
  - Returns: { services, models, operations, errors }

POST /api/v1/validate
  - Validate DSL syntax
  - Payload: { content }
  - Returns: { valid, errors: [...] }

POST /api/v1/export
  - Export parsed requirements
  - Payload: { fileId, format: "json" | "yaml" }
  - Returns: file download or { content }
```

---

## Success Indicators

Feature 002 is successfully implemented when:

1. ✅ A requirements engineer can author a complete API spec (3+ models, 5+ operations) in under 10 minutes
2. ✅ All syntax errors appear within 500ms
3. ✅ Preview pane updates within 1 second
4. ✅ Autocomplete suggestions appear within 200ms
5. ✅ At least 90% of valid DSL parses without errors
6. ✅ New users can create valid specs with minimal documentation
7. ✅ Exported files maintain 100% fidelity

---

## Next Steps

1. **Implement Feature 002** following the spec and this testing guide
2. **Run these tests manually** as features are completed
3. **Automate tests** with Vitest (frontend) and pytest (backend)
4. **Performance test** with large files
5. **User acceptance testing** with actual requirements engineers
6. **Deploy to production** with confidence

---

**Note**: This guide was created based on the Feature 002 specification. As implementation progresses, update this guide with actual behavior and any deviations from the spec.
