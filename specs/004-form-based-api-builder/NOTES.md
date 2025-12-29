# Feature Notes: Form-Based API Builder

## Implementation Notes

### Persistence Requirements

**Status: ✅ Implemented (2025-12-26)**

Form state is now persisted to localStorage with:
- **Auto-save**: Debounced save triggers when form is dirty (10-second delay)
- **Manual Save button**: Immediate save with visual feedback
- **State restoration**: Persisted state automatically restored on page load
- **Save indicator**: Shows "Saving...", "Saved X ago", or error status

**Implementation:**
- `useFormPersistence` hook: Auto-triggers save when `state.isDirty` and `state.oasData` change
- Save button: Disabled when not dirty or already saving
- State restoration: Runs once on mount via `useEffect`

**Files Changed:**
- `frontend/src/hooks/useFormPersistence.ts` - Added auto-save effect
- `frontend/src/pages/ApiBuilderPage.tsx` - Added Save button and state restoration

**Future Enhancement (optional):**
- Backend API persistence for cross-device sync

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
