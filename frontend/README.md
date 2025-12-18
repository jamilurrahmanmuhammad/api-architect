# API Architect Frontend

Requirements Grammar Authoring Studio - Web-based editor for API specifications.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env.local from template
cp .env.example .env.local
# Edit .env.local if needed (API_URL defaults to localhost:8000)
```

### Development

```bash
# Start development server with HMR
npm run dev

# Run in another terminal
npm run typecheck  # Check TypeScript types
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Shadcn UI components
│   │   ├── layout/       # Layout components
│   │   ├── common/       # Common components
│   │   └── modules/      # Feature-specific components
│   ├── pages/            # Page components
│   ├── routes.tsx        # React Router configuration
│   ├── App.tsx           # Root component with theme
│   ├── main.tsx          # Entry point with providers
│   ├── hooks/            # Custom React hooks
│   │   └── useEditorApi.ts  # TanStack Query hooks
│   ├── store/            # Redux state management
│   │   ├── index.ts      # Store configuration
│   │   ├── hooks.ts      # Typed Redux hooks
│   │   └── slices/       # Redux slices
│   ├── providers/        # Context providers
│   │   ├── ReduxProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── services/         # API client services
│   ├── types/            # TypeScript type definitions
│   ├── stores/           # Zustand stores (legacy)
│   ├── lib/              # Utility functions
│   ├── assets/           # Static assets
│   └── index.css         # Global styles (Tailwind)
├── tests/                # Test files
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── vitest.config.ts     # Vitest configuration
└── package.json         # Dependencies and scripts
```

## Technology Stack

### Core
- **React 19** - UI framework with latest hooks
- **TypeScript 5.9** - Type-safe development
- **Vite 7** - Lightning-fast build tool
- **React Router 7** - Client-side routing

### State Management
- **Redux Toolkit** - Centralized state with immer & thunk
  - `store/slices/editorSlice.ts` - Editor content & parsing state
  - `store/slices/fileSlice.ts` - File list & metadata
  - `store/slices/uiSlice.ts` - UI state (modals, notifications)
- **Zustand** - Lightweight stores (theme, auth)

### Data Fetching
- **TanStack Query (React Query)** - Async data management
  - Automatic caching and background refetching
  - Request deduplication
  - Optimistic updates
  - Devtools integration
- **Hooks** - `src/hooks/useEditorApi.ts` for all API calls

### UI & Styling
- **Tailwind CSS 4** - Utility-first styling
- **Shadcn UI** - Accessible component library
- **Lucide React** - SVG icon library
- **Radix UI** - Headless UI primitives

### Development & Testing
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking for tests
- **ESLint + TypeScript** - Code quality
- **Prettier** - Code formatting

## State Management Architecture

### Redux (Centralized)

**Use Redux for:**
- Editor content and parsing state
- File list and metadata
- Modal/UI visibility
- Application-wide notifications
- Global loading states

**Slices:**
1. `editorSlice` - Current file, content, parse results, preview data
2. `fileSlice` - File list pagination, CRUD operations
3. `uiSlice` - Modals, sidebar, notifications, loading states

**Usage:**
```tsx
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrentFile, updateContent } from '@/store/slices/editorSlice';

export function Editor() {
  const dispatch = useAppDispatch();
  const content = useAppSelector(state => state.editor.content);

  const handleChange = (newContent: string) => {
    dispatch(updateContent(newContent));
  };

  return <textarea value={content} onChange={(e) => handleChange(e.target.value)} />;
}
```

### TanStack Query (Async)

**Use React Query for:**
- API calls (fetch, create, update, delete)
- Server state caching
- Background refetching
- Automatic retry/error handling

**Hooks:** All in `src/hooks/useEditorApi.ts`
- `useFileList()` - Fetch paginated files
- `useFile(id)` - Fetch single file
- `useCreateFile()` - Create new file
- `useUpdateFile(id)` - Update file content
- `useDeleteFile(id)` - Delete file
- `useParse(content)` - Parse DSL content
- `useValidate(content)` - Validate DSL
- `useExport(id)` - Export file

**Usage:**
```tsx
import { useFileList, useCreateFile } from '@/hooks/useEditorApi';

export function FileManager() {
  const { data, isLoading } = useFileList(1, 10);
  const createFile = useCreateFile();

  return (
    <>
      {isLoading && <Spinner />}
      {data?.files.map(file => <FileCard key={file.id} file={file} />)}
      <button onClick={() => createFile.mutate({ name: 'New File' })}>
        Create
      </button>
    </>
  );
}
```

### Zustand (Lightweight)

**Use Zustand for:**
- Theme preferences
- User authentication state
- Modal state (simple cases)

**Stores:** `src/stores/`
- `themeStore.ts` - Theme mode
- `authStore.ts` - User session
- `moduleStore.ts` - Module state

## API Integration

### Base URL

Set via environment variable in `.env.local`:
```
VITE_API_URL=http://localhost:8000
```

### Query Keys

React Query uses namespaced query keys for cache management:
```typescript
editorQueryKeys = {
  all: ['editor'],
  files: () => [..., 'files'],
  file: (id) => [..., 'files', id],
  parse: () => [..., 'parse'],
  validate: () => [..., 'validate'],
  export: () => [..., 'export'],
}
```

### Error Handling

All API hooks automatically:
- Retry failed requests once
- Use exponential backoff for retries
- Integrate with Redux UI state for error notifications
- Provide `isError`, `error` in hook return

```tsx
const { data, isError, error, isPending } = useFile(fileId);

if (isError) {
  return <Alert variant="destructive">{error.message}</Alert>;
}
```

## Development Workflow

### Creating a New Feature

1. **Define Redux state** (if global state needed)
   ```bash
   # Add slice in src/store/slices/featureSlice.ts
   # Add typed hooks in src/store/hooks.ts
   ```

2. **Define API hooks** (for server communication)
   ```bash
   # Add hooks in src/hooks/useEditorApi.ts (or new file)
   ```

3. **Create components**
   ```bash
   # Organize in src/components/
   # Use typed Redux and Query hooks
   ```

4. **Wire up with providers**
   ```tsx
   // Wrap with ReduxProvider and QueryProvider in main.tsx (already done)
   ```

### Testing

```bash
# Run tests
npm run test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## Browser Support

- Chrome/Edge 120+
- Firefox 121+
- Safari 17+

## Performance Optimizations

1. **Code Splitting** - Vite automatic chunks per route
2. **Tree Shaking** - Unused code removed in build
3. **Lazy Loading** - React lazy() for page components
4. **Request Deduplication** - React Query dedupes concurrent requests
5. **Caching Strategy** - 5-min stale time, 10-min garbage collection

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_API_VERSION` | `v1` | API version |
| `VITE_APP_NAME` | `API Architect` | App name in UI |
| `VITE_APP_VERSION` | `0.1.0` | App version |

## Deployment

### Build for Production

```bash
npm run build
# Output: dist/ directory

# Test production build
npm run preview
```

### Docker

```bash
docker build -t api-architect-frontend .
docker run -p 3000:80 api-architect-frontend
```

### Kubernetes

See `k8s/frontend-deployment.yaml` for Kubernetes manifest.

## Common Tasks

### Add a new component
```bash
# Create in src/components/
# Use TypeScript (.tsx)
# Include PropTypes or interface
```

### Add a new Redux action
```bash
# Add to src/store/slices/XSlice.ts
# Use PayloadAction for typed payloads
# Export from slices file and index.ts
```

### Add a new API endpoint
```bash
# Add hook in src/hooks/useEditorApi.ts
# Follow TanStack Query patterns
# Use editorQueryKeys for cache management
```

## Troubleshooting

### HMR not working
```bash
# Clear .vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

### Type errors in editor
```bash
# Run type checker
npm run typecheck

# Regenerate tsconfig
npx tsc --init
```

### API calls failing
1. Check `VITE_API_URL` in `.env.local`
2. Ensure backend is running (`http://localhost:8000`)
3. Check browser console for CORS errors
4. Verify request in React Query DevTools

## Contributing

1. Use TDD - write tests before implementation
2. Follow TypeScript strict mode
3. Use pre-commit hooks (`npm run lint && npm run format`)
4. Update types when changing API contracts
5. Document complex components with JSDoc

## References

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide)
- [Redux Toolkit Docs](https://redux-toolkit.js.org)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
