# Feature Notes: Form-Based API Builder

## Implementation Notes

### Persistence Requirements

**Priority: High**

Currently, the form builder stores changes in-memory (React state). Changes are lost on page refresh.

**Required Enhancement:**
- Add a **Save button** to persist changes
- Options for persistence backend:
  1. localStorage (client-side, survives refresh)
  2. Backend API (server-side, survives across devices)
  3. Both (localStorage as cache, API as source of truth)

**User Feedback (2024-12-25):**
> "There should be a save button to make the change persisted."

---

## Bug Fixes Applied

### Focus Loss Bug in FieldEditor (Fixed 2024-12-25)

**Problem:** When typing a new field name in the FieldEditor, focus was lost after every keystroke, eventually causing the page to crash.

**Root Cause:**
- Using `key={fieldName}` in table rows caused React to unmount/remount inputs on every change
- Direct `onChange` handlers triggered parent re-renders on each keystroke

**Solution:**
- Created controlled input components (`FieldNameInput`, `FieldDescriptionInput`) with local state
- Changed to `key={index}` for stable React keys
- Inputs now commit on blur instead of on every keystroke

**Files Changed:**
- `frontend/src/components/forms/tabs/FieldEditor.tsx`
