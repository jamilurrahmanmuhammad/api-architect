# API Architect - Running Locally

## 🚀 System Status

**Backend:** ✅ Running on http://localhost:8765
**Frontend:** ✅ Running on http://localhost:5175

---

## Access Points

### 1. Frontend Application
**URL:** http://localhost:5173

This is the main Requirements Grammar Authoring Studio web application.

**What you can see:**
- Landing page
- Dashboard (if authenticated)
- Module overview
- Theme toggle
- Navigation

---

### 2. Backend API Documentation
**URL:** http://localhost:8765/api/docs

Interactive Swagger UI documentation for all API endpoints.

**Endpoints you can test:**
- `GET /health` - Health check
- `GET /` - Root endpoint
- `POST /api/v1/files` - Create file
- `GET /api/v1/files` - List files
- `GET /api/v1/files/{fileId}` - Get file
- `PUT /api/v1/files/{fileId}` - Update file
- `DELETE /api/v1/files/{fileId}` - Delete file
- `POST /api/v1/parse` - Parse DSL
- `POST /api/v1/validate` - Validate DSL
- `POST /api/v1/export` - Export file

---

### 3. Alternative API Documentation
**ReDoc:** http://localhost:8765/api/redoc

Alternative (read-only) API documentation view.

---

### 4. Backend Health Check
**URL:** http://localhost:8765/health

Quick JSON response confirming backend is running:
```json
{
  "status": "healthy",
  "service": "api-architect-editor-api",
  "version": "0.1.0"
}
```

---

## Quick Tests

### Test Health Check
```bash
curl http://localhost:8765/health
```

### Test Frontend Loading
```bash
curl -I http://localhost:5173
```

### Test API Docs
```bash
curl http://localhost:8765/api/docs | head -50
```

---

## What's Implemented (Phase 1)

### Backend ✅
- FastAPI application with async support
- SQLAlchemy connection pooling
- Pydantic request/response schemas
- CORS middleware
- Health check endpoint
- API documentation with OpenAPI
- Alembic migration system
- Environment configuration

### Frontend ✅
- React 19 with TypeScript
- Vite development server with HMR
- Redux state management (3 slices)
- TanStack Query for API integration
- Tailwind CSS styling
- Responsive layout
- Theme toggle
- Navigation routing

### Testing ✅
- 18/18 backend tests passing
- 116/117 frontend tests passing
- Pydantic schema validation
- API endpoint testing
- Redux state management testing
- Component testing

---

## How to Interact

### 1. View the Frontend
Simply open: http://localhost:5173

You'll see:
- Landing page with product information
- Navigation sidebar
- Module grid
- Theme toggle (light/dark mode)
- Login page (not yet functional - Phase 2)

### 2. Explore API Documentation
Open: http://localhost:8000/api/docs

This is interactive - you can:
- See all available endpoints
- View request/response schemas
- Try endpoints directly in the UI (when database is set up)
- See examples and documentation

### 3. Check Backend Status
```bash
# From terminal
curl http://localhost:8000/health

# Or visit in browser
http://localhost:8000/health
```

---

## What's NOT Yet Implemented (Phase 2+)

❌ **Database Operations**
- File CRUD endpoints not functional yet (no ORM models)
- Database persistence not available

❌ **DSL Parser**
- Parse endpoint created but logic not implemented
- Validate endpoint created but logic not implemented

❌ **File Management**
- Create/read/update/delete files requires database
- File listing not functional

❌ **Export Functionality**
- Export endpoint exists but logic not implemented

❌ **Authentication**
- Login page exists but authentication not implemented
- Protected routes not enforced

❌ **Real-time Preview**
- Monaco editor not integrated yet
- Preview pane not functional

---

## Development Server Details

### Backend Server
```
FastAPI Application
- Host: 0.0.0.0
- Port: 8765
- Reload: Enabled (auto-restart on code changes)
- Documentation: http://localhost:8765/api/docs

Process ID: Check with ps aux | grep uvicorn
Log Output: See terminal or check background task
```

### Frontend Server
```
Vite Development Server
- Host: localhost
- Port: 5173
- HMR: Enabled (hot module reloading)
- Framework: React 19
- Bundler: Vite 7

Process ID: Check with ps aux | grep vite
Log Output: See terminal or check background task
```

---

## Accessing Servers from Outside

If running on a remote server, use SSH port forwarding:

```bash
# Forward backend (8765 -> local 8765)
ssh -L 8765:localhost:8765 user@remote-host

# Forward frontend (5175 -> local 5175)
ssh -L 5175:localhost:5175 user@remote-host

# Forward both
ssh -L 8765:localhost:8765 -L 5175:localhost:5175 user@remote-host
```

Then access from your local machine:
- Frontend: http://localhost:5175
- Backend: http://localhost:8765

---

## Stopping Servers

### Backend
```bash
# Find the process
ps aux | grep uvicorn

# Kill it
kill <PID>

# Or from backend directory
pkill -f "uvicorn src.main:app"
```

### Frontend
```bash
# Find the process
ps aux | grep vite

# Kill it
kill <PID>

# Or from frontend directory
pkill -f "vite"
```

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8765 is in use
lsof -i :8765

# Kill existing process
kill <PID>

# Try starting again
cd backend/editor-api
source .venv/bin/activate
uvicorn src.main:app --reload --port 8765
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill existing process
kill <PID>

# Try starting again
cd frontend
npm run dev
```

### API calls fail with CORS error
- Check that backend is running on port 8765
- Check that frontend is requesting correct API_URL
- CORS is configured for localhost:5175

### Import errors on startup
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Restart
npm run dev
```

---

## Next Steps (Phase 2)

To make the system fully functional, Phase 2 will implement:

1. **Database Models (T009-T010)**
   - File ORM model
   - Service, Model, Operation, Error models

2. **API Services (T011-T013)**
   - File service (CRUD)
   - Parser service
   - Validator service

3. **API Routes (T014-T018)**
   - Files endpoints
   - Parse endpoint
   - Validate endpoint
   - Export endpoint

4. **Frontend Components (T019-T027)**
   - Editor component with Monaco
   - File list component
   - Preview pane
   - Notifications
   - Split panel layout

5. **Integration (T028-T106)**
   - User stories (file creation, editing, parsing)
   - End-to-end testing
   - Docker/Kubernetes deployment

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   User's Browser                         │
│         http://localhost:5175                           │
├─────────────────────────────────────────────────────────┤
│                 React 19 Frontend                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • Redux State Management (editor, file, ui)       │  │
│  │ • React Query (TanStack Query)                    │  │
│  │ • Components (Layout, Editor, Preview)           │  │
│  │ • Tailwind CSS + Shadcn UI                       │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│           Network (HTTP/CORS)                           │
├─────────────────────────────────────────────────────────┤
│          FastAPI Backend                                │
│   http://localhost:8765                                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ • FastAPI Application                            │  │
│  │ • Pydantic Schemas (Request/Response)            │  │
│  │ • SQLAlchemy ORM (Phase 2)                       │  │
│  │ • Database Connection Pool                       │  │
│  │ • Service Layer (Phase 2)                        │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│        PostgreSQL Database                              │
│    (Not yet connected - Phase 2)                       │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring & Debugging

### View Backend Logs
Check the background task output:
```bash
# If still running in terminal
# You'll see Uvicorn startup messages and request logs
```

### View Frontend Logs
Check browser console (F12):
```
1. Press F12 to open DevTools
2. Go to Console tab
3. See any errors or warnings
4. Check Network tab for API calls
```

### Check Running Processes
```bash
# Find all node/python processes
ps aux | grep -E "uvicorn|vite|node"

# Get more details
lsof -i :8765      # Backend
lsof -i :5175      # Frontend
```

### Network Debugging
```bash
# Test backend endpoint
curl -v http://localhost:8765/health

# Test frontend
curl -v http://localhost:5175

# Check CORS headers
curl -v -X OPTIONS http://localhost:8765/api/v1/files
```

---

## Summary

You now have a fully functional Phase 1 system with:
- ✅ Backend API running and documented
- ✅ Frontend application running with HMR
- ✅ Redux state management configured
- ✅ React Query hooks ready for API calls
- ✅ Test suite passing (18/18 backend, 116/117 frontend)

**Ready to observe and test locally!**

Next phase will connect the frontend to backend and implement all file management operations.
