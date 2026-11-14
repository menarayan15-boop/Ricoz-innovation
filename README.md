# Immigration & Work Visa Dossier Builder

An enterprise-grade, AI-powered LegalTech platform designed to streamline the preparation, verification, organization, and generation of attorney-ready visa application dossiers for employment-based immigration petitions.

## Supported Visa Petitions
- **H-1B Visa** (Specialty Occupations)
- **O-1 Visa** (Individuals with Extraordinary Ability or Achievement)
- **EB-2 Visa** (Members of the Professions Holding Advanced Degrees or Exceptional Ability)
- **EB-2 NIW** (National Interest Waiver Subtype)

---

## Architecture Overview

The system strictly follows a decoupled architectural pattern:
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React icons. Handles presentation, interactive wizards, client-side state, and responsive layouts.
- **Backend**: Node.js, Express.js REST API, TypeScript. Houses all business logic, validation, AI orchestrations, OCR, PDF pipelines, and database interactions.
- **Database**: MongoDB with Mongoose ODM for structured, indexed schema modeling.
- **Security**: JWT authentication, bcrypt password hashing, role-based access control (RBAC), private cloud storage with signed download tokens, and strict environment variable isolation.

```
immigration-dossier-builder/
│
├── frontend/                 # Next.js Application (Port 3000)
│   ├── app/                  # Next.js App Router (pages & layouts)
│   ├── components/           # Reusable UI components
│   ├── features/             # Feature-specific modules
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities & helpers
│   ├── services/             # Typed API clients for Express backend
│   ├── types/                # Shared TypeScript definitions
│   └── public/               # Static assets
│
├── backend/                  # Express.js REST API (Port 5001)
│   ├── src/
│   │   ├── config/           # Database, environment, and cloud configs
│   │   ├── controllers/      # Route request handlers
│   │   ├── middleware/       # Auth, error, rate-limiting, logging
│   │   ├── models/           # Mongoose data models
│   │   ├── routes/           # REST API route declarations
│   │   ├── services/         # Core business logic, OCR, AI, PDF engines
│   │   ├── validators/       # Request validation schemas (Zod)
│   │   ├── utils/            # Shared utilities & loggers
│   │   └── types/            # Backend TypeScript types
│   └── tests/                # Automated integration & unit tests
│
├── docs/                     # Architectural specifications & guides
├── DEVELOPMENT_PROGRESS.md   # Phase-by-phase development audit log
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18.x, v20.x, or v22.x+ recommended)
- npm (v9.x+)
- MongoDB (Local instance or MongoDB Atlas URI; an automated in-memory instance is available for local testing/dev when `USE_MEMORY_DB=true`)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
The backend API server will start at `http://localhost:5001`.

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
The Next.js user interface will be available at `http://localhost:3000`.

---

## Health & Status Check Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | `GET` | API meta-information and active endpoints |
| `/api/v1/health` | `GET` | Service uptime, memory, version, and database status |
| `/api/v1/health/db` | `GET` | Live MongoDB connection state and ping latency |

---

## Testing

Run automated backend tests:
```bash
cd backend
npm test
```

---

## Development Roadmap
- **Phase 1**: Project Foundation & Communication Gateway (Completed & Verified)
- **Phase 2**: UI Foundation & Design System
- **Phase 3**: Authentication & Role-Based Access Control
- **Phase 4**: Application Management & Guided Wizards
- **Phase 5**: Secure Document Management
- **Phase 6**: AI & OCR Document Intelligence
- **Phase 7**: Document Consistency & Validation Engine
- **Phase 8**: AI Visa Dossier Generator (PDF Assembler)
- **Phase 9**: Attorney Collaboration Workspace
- **Phase 10**: AI Immigration Assistant & In-App Notifications
- **Phase 11**: Security & Performance Hardening
- **Phase 12**: Final Deployment & Production Verification
