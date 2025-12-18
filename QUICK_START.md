# 🚀 Quick Start - API Architect Phase 1

## Running Now ✅

Both systems are currently running. Access them here:

### Frontend (React 19 + Redux + React Query)
👉 **http://localhost:5173**

### Backend API (FastAPI + OpenAPI Docs)
👉 **http://localhost:8000/api/docs**

### Health Check
👉 **http://localhost:8000/health**

---

## What You Can Do Right Now

### 1. View the Frontend
Open **http://localhost:5173** and you'll see:
- Landing page with product branding
- Navigation sidebar
- Module grid
- Theme toggle (light/dark mode)
- Login page (UI only, not functional yet)
- Responsive design

### 2. Explore the Backend API
Open **http://localhost:8000/api/docs** and you can:
- See all available endpoints
- Read documentation for each endpoint
- View request/response schemas
- See code examples

**Available endpoints:**
- `GET /health` - Server health
- `POST /api/v1/files` - Create file
- `GET /api/v1/files` - List files
- `GET /api/v1/files/{id}` - Get file
- `PUT /api/v1/files/{id}` - Update file
- `DELETE /api/v1/files/{id}` - Delete file
- `POST /api/v1/parse` - Parse DSL
- `POST /api/v1/validate` - Validate DSL
- `POST /api/v1/export` - Export file

### 3. Check Browser DevTools
Press **F12** in the frontend and:
- Check Console for any errors
- View Network tab to see API calls
- Inspect React components
- Use React DevTools extension (if installed)

### 4. Check Backend Documentation
Open **http://localhost:8000/api/redoc** for alternative API documentation view

---

## Test the Systems

### Test Backend is Running
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "api-architect-editor-api",
  "version": "0.1.0"
}
```

### Test Frontend is Running
```bash
curl http://localhost:5173 | head -20
```

**Expected:** HTML document returned

---

## Modify Code (Hot Reload Works!)

### Make a frontend change
1. Edit any file in `frontend/src/`
2. Save the file
3. Browser automatically reloads (HMR)
4. Your changes appear instantly

### Make a backend change
1. Edit any file in `backend/editor-api/src/`
2. Save the file
3. Uvicorn auto-restarts (Reload: Enabled)
4. API docs update automatically

---

## Run Tests

### Backend Tests
```bash
cd backend/editor-api
source .venv/bin/activate
pytest tests/ -v
```
✅ 18/18 passing

### Frontend Tests
```bash
cd frontend
npm run test -- --run
```
✅ 116/117 passing (1 skipped)

### Watch Mode (Development)
```bash
# Backend
cd backend/editor-api && source .venv/bin/activate && pytest tests/ --watch

# Frontend
cd frontend && npm run test
```

---

## What's Implemented ✅

| Component | Status | Details |
|-----------|--------|---------|
| Backend Framework | ✅ | FastAPI with async support |
| Frontend Framework | ✅ | React 19 + Vite |
| State Management | ✅ | Redux Toolkit (3 slices) |
| API Integration | ✅ | React Query hooks ready |
| Styling | ✅ | Tailwind CSS + Shadcn UI |
| Testing | ✅ | 134/135 tests passing |
| Documentation | ✅ | OpenAPI/Swagger |
| Environment Config | ✅ | .env support |
| Database Setup | ✅ | Alembic migrations ready |

---

## What's NOT Yet Implemented ❌

| Feature | When | Notes |
|---------|------|-------|
| File CRUD | Phase 2 | Database models needed |
| DSL Parser | Phase 2 | Parser service needed |
| Authentication | Phase 2 | Auth service needed |
| Monaco Editor | Phase 2 | Editor component |
| Real-time Preview | Phase 2 | Preview service |
| Docker/K8s | Phase 3 | Deployment configs |

---

## Directory Structure

```
api-architect/
├── backend/editor-api/          # FastAPI backend
│   ├── src/
│   │   ├── main.py              # Entry point
│   │   ├── db/                  # Database setup
│   │   ├── models/              # Pydantic schemas
│   │   ├── api/                 # Route handlers (Phase 2)
│   │   ├── services/            # Business logic (Phase 2)
│   │   └── middleware/          # Middleware
│   ├── tests/                   # Test suite
│   └── pyproject.toml           # Dependencies
│
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── store/               # Redux (3 slices)
│   │   ├── hooks/               # React Query hooks
│   │   ├── components/          # UI components
│   │   ├── pages/               # Page components
│   │   ├── providers/           # Context providers
│   │   └── services/            # API services
│   ├── tests/                   # Test suite
│   └── package.json             # Dependencies
│
├── PHASE_1_SUMMARY.md           # Phase 1 recap
├── TESTING_GUIDE.md             # Testing documentation
├── TEST_RESULTS.md              # Test results
└── RUNNING_LOCALLY.md           # This guide
```

---

## Key Technologies

### Backend
- **FastAPI 0.104** - Modern async Python web framework
- **SQLAlchemy 2.0** - ORM with async support
- **Pydantic 2.5** - Data validation
- **PostgreSQL** - Database (via asyncpg)
- **Alembic** - Migration management
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7** - Fast build tool
- **Redux Toolkit** - State management
- **React Query** - Data fetching
- **Tailwind CSS 4** - Styling
- **Shadcn UI** - Component library

---

## Common Commands

### Start Servers
```bash
# Backend (from backend/editor-api)
source .venv/bin/activate && uvicorn src.main:app --reload

# Frontend (from frontend)
npm run dev
```

### Run Tests
```bash
# Backend
cd backend/editor-api && source .venv/bin/activate && pytest tests/ -v

# Frontend
cd frontend && npm run test -- --run
```

### View Coverage
```bash
# Backend
cd backend/editor-api && pytest --cov=src

# Frontend
cd frontend && npm run test:coverage
```

### Format Code
```bash
# Backend
cd backend/editor-api && source .venv/bin/activate && black src/ && ruff check src/

# Frontend
cd frontend && npm run format
```

---

## Browser DevTools Tips

### React DevTools
1. Install React DevTools extension for your browser
2. Open DevTools (F12)
3. Go to "Components" tab
4. Explore component tree
5. See props and state in real-time

### Redux DevTools
1. Install Redux DevTools extension
2. Open DevTools (F12)
3. Go to "Redux" tab
4. See all dispatched actions
5. Time-travel debug state changes

### Network Tab
1. Open DevTools (F12)
2. Go to "Network" tab
3. Perform actions in the app
4. See API calls to http://localhost:8000
5. Inspect request/response payloads

---

## Troubleshooting

### Can't access frontend
```bash
# Check if running
lsof -i :5173

# Kill existing process
kill <PID>

# Restart
cd frontend && npm run dev
```

### Can't access API
```bash
# Check if running
lsof -i :8000

# Kill existing process
kill <PID>

# Restart
cd backend/editor-api
source .venv/bin/activate
uvicorn src.main:app --reload
```

### Clear cache
```bash
# Frontend
rm -rf frontend/node_modules/.vite

# Backend
rm -rf backend/editor-api/.pytest_cache
```

---

## Next Phase (Phase 2)

Coming next:
1. **Database Integration** - Connect to PostgreSQL
2. **ORM Models** - File, Service, Model, Operation, Error
3. **API Services** - File, Parser, Validator
4. **API Routes** - Complete CRUD endpoints
5. **Frontend Integration** - Connect UI to API

Follow TDD approach:
- Write tests first (RED)
- Implement code (GREEN)
- Refactor (BLUE)

---

## Need Help?

See detailed documentation:
- **RUNNING_LOCALLY.md** - Complete server guide
- **TESTING_GUIDE.md** - How to test both systems
- **TEST_RESULTS.md** - Current test status
- **PHASE_1_SUMMARY.md** - What was implemented

---

**You're all set! Start exploring at http://localhost:5173** 🎉
