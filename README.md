# PrepForge – AI Interview Preparation Kit

[![Assessment ID](https://img.shields.io/badge/Assessment%20ID-FS--AI--INTERVIEW--01-indigo.svg)](https://github.com/Pansaredk/prepforge)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PrepForge** is a full-stack engineering platform that transforms job descriptions and company URLs into personalized, structured interview preparation kits. It features an AI analysis pipeline, an interactive kit builder, an active recall practice deck, a batch evaluation CLI, and an automated verification test suite.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Features](#key-features)
   - [Authentication & User Isolation](#1-authentication--user-isolation)
   - [Core AI Interview Pipeline](#2-core-ai-interview-pipeline)
   - [Kit Builder & Editing](#3-kit-builder--editing)
   - [Practice Mode & Active Recall](#4-practice-mode--active-recall)
   - [Batch Evaluation Engine](#5-batch-evaluation-engine)
   - [Automated Verification Suite](#6-automated-verification-suite)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Backend Installation & Startup](#backend-installation--startup)
   - [Frontend Installation & Startup](#frontend-installation--startup)
6. [CLI Commands](#cli-commands)
   - [Batch Evaluator CLI](#batch-evaluator-cli)
   - [Automated Test Suite](#automated-test-suite)
7. [API Specification](#api-specification)
8. [Security & Production Readiness](#security--production-readiness)
9. [Design Decisions & Trade-Offs](#design-decisions--trade-offs)
10. [Known Limitations](#known-limitations)

---

## Architecture Overview

PrepForge is engineered as a decoupled full-stack application:

```
                  ┌─────────────────────────────────────────┐
                  │          Next.js 14 Frontend            │
                  │   App Router, Tailwind CSS, SSR + CSR   │
                  └────────────────────┬────────────────────┘
                                       │ HTTP / Cookies (SameSite, HttpOnly)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │         Node.js + Express Backend       │
                  │  Controllers, Services, Auth Middleware │
                  └─────────┬─────────────────────┬─────────┘
                            │                     │
               MongoDB + Mongoose                 │ Deterministic Pipeline Engine
        (Kits, Users, MongoStore Sessions)        │ (Research, Extraction, Schedule)
                            ▼                     ▼
                  ┌───────────────────┐ ┌───────────────────┐
                  │  MongoDB Database │ │ Batch Evaluator   │
                  │   localhost:27017 │ │  CLI Runner       │
                  └───────────────────┘ └───────────────────┘
```

---

## Key Features

### 1. Authentication & User Isolation
- **Express Sessions**: Backed by MongoDB session store (`connect-mongo`) with HttpOnly cookies, CSRF-resistant `sameSite: 'lax'`, and configurable `secure` cookies.
- **Password Security**: Passwords hashed with `bcryptjs` (salt rounds: 10).
- **Strict Ownership**: Every kit operation validates `kit.userId === req.userId`. Users cannot view, modify, or delete kits belonging to other accounts.

### 2. Core AI Interview Pipeline
- **Company Web Research**: Safe URL crawling with SSRF protection (private IP blocking, protocol enforcement). Resilient fallback extracts domain information and grounds answers directly in the job description if a website is unreachable.
- **Requirement Extraction**: Parses job descriptions into structured requirements with deterministic classification into `must-have` and `nice-to-have`.
- **Grounded Question Generation**: Generates Technical, Behavioral, and Situational interview questions mapped to specific requirement IDs.
- **Coverage Checker & Repair Pass**: Verifies that 100% of must-have requirements are addressed. Automatically generates additional targeted questions if coverage gaps exist.
- **Deterministic Study Schedule**: Distributes question bank items across the user's preparation timeframe (1 to 60 days). Ensures core must-haves are prioritized in earlier days while keeping study duration balanced.
- **Active Recall Flashcards**: Generates paired front (prompt) and back (structured talking points) flashcards for every question in the bank.

### 3. Kit Builder & Editing
- **Company Brief & Role Breakdown Editing**: Modal editor allowing full customization of company overview, products, culture context, responsibilities, and required skills.
- **Requirements Management**: Add custom requirements, toggle `must-have` vs. `nice-to-have`, or delete requirements with automatic recalculation of coverage percentage.
- **Question Bank Customization**:
  - Add custom interview questions with custom answer outlines and requirement mappings.
  - In-place editing of question text, category, duration, and answer structure.
  - Reorder questions using intuitive Move Up / Move Down controls.
  - Delete questions with automatic cascading cleanup of associated flashcards and schedule assignments.
- **Selective AI Regeneration**:
  - **Regenerate Brief**: Refreshes company and role summaries from the JD without affecting questions.
  - **Regenerate Category Questions**: Selectively regenerate Technical, Behavioral, or Situational questions.
  - **Pinning Protection (`pinned: true`)**: Questions flagged as pinned, edited, or user-created are strictly preserved during selective regeneration.
  - **Regenerate Schedule**: Recalculates study schedule days and time allocations after question bank changes.

### 4. Practice Mode & Active Recall
- **Interactive Flashcard Deck**: Clean, focused interface accessible at `/kits/[id]/practice`.
- **Reveal Answer**: Candidates can formulate their answer before revealing key talking points and structured frameworks.
- **Confidence Rating**: Rate confidence as **Low**, **Medium**, or **High** after reviewing each card (persisted to MongoDB).
- **Smart Queue**: Automatically prioritizes unreviewed cards first, followed by low-confidence cards, medium-confidence cards, and finally high-confidence cards.
- **Session Summary**: Real-time progress bar and comprehensive completion summary with confidence distribution and repeat options.

### 5. Batch Evaluation Engine
- Command-line runner for batch generating interview kits from a JSON cases file.
- Strict compliance with TRAO Appendix B JSON output format.
- Unbreakable pipeline resilience: skips or recovers gracefully from network timeouts or invalid company domains without halting batch execution.
- Command:
  ```bash
  npm run evaluate -- --input cases/sample.json --output cases/output.json
  ```

### 6. Automated Verification Suite
- Comprehensive automated test runner executing 16 validation invariants without external network dependencies:
  - Schedule day count preservation ($days = 1$, $days = 60$).
  - Schedule integer minute calculations.
  - Full question bank inclusion in schedules.
  - Deterministic coverage checker validation.
  - Schema structural validation.
  - Batch evaluator error handling and resilience.
- Command:
  ```bash
  npm test
  ```

---

## Technology Stack

- **Frontend**: Next.js 14 (App Router, Client & Server Components), React 18, Tailwind CSS, Heroicons styling.
- **Backend**: Node.js, Express 4, Mongoose 8, express-session, connect-mongo, bcryptjs, dotenv, cors.
- **Database**: MongoDB (local or MongoDB Atlas).
- **Tooling**: ESLint, native Node test runner scripts.

---

## Project Structure

```text
ai-interview-prep/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & session configuration
│   │   ├── controllers/        # Request handlers (authController, kitController)
│   │   ├── middleware/         # Authentication and error handling middleware
│   │   ├── models/             # Mongoose schemas (User, InterviewKit)
│   │   ├── routes/             # Express API routes (authRoutes, kitRoutes)
│   │   ├── services/           # Pipeline business logic
│   │   │   ├── briefService.js
│   │   │   ├── coverageService.js
│   │   │   ├── crawlerService.js
│   │   │   ├── flashcardService.js
│   │   │   ├── kitGenerationService.js
│   │   │   ├── llmService.js
│   │   │   ├── pipelineEngine.js
│   │   │   ├── questionService.js
│   │   │   └── scheduleService.js
│   │   ├── utils/              # URL validation, SSRF filters, schedule helpers
│   │   └── server.js           # Express application entry point
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── dashboard/          # Dashboard with quick actions and stats
│   │   ├── kits/               # Kit listings and detail builder
│   │   │   ├── [id]/
│   │   │   │   ├── page.js     # Full Kit Builder & Inspector
│   │   │   │   └── practice/
│   │   │   │       └── page.js # Interactive Flashcard Practice Mode
│   │   │   └── new/            # New Kit Generation Wizard
│   │   ├── login/              # User Login Page
│   │   ├── register/           # User Registration Page
│   │   ├── globals.css         # Tailwind directives
│   │   └── page.js             # Landing page
│   ├── components/             # Reusable UI components
│   ├── lib/
│   │   └── api.js              # Client-side API client
│   └── package.json
├── cases/
│   ├── sample.json             # Test cases (1-day, 60-day, unreachable domain)
│   └── output.json             # Evaluator output (Appendix B format)
├── scripts/
│   ├── evaluate.js             # Batch evaluation runner
│   └── test.js                 # Automated invariant test suite
├── .env.example                # Sample environment configuration
├── package.json                # Root package scripts
└── README.md                   # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **MongoDB**: v6.0 or later running locally on `mongodb://localhost:27017` (or MongoDB Atlas connection string)
- **npm**: v9.0.0 or later

### Environment Variables
Copy `.env.example` to `backend/.env` (or configure in your shell):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_interview_prep
SESSION_SECRET=prepforge_super_secret_session_key_2026
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

For the frontend, create `frontend/.env.local` (optional, defaults to `http://localhost:5000/api`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend Installation & Startup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server with live reload
npm run dev

# Or start in production mode
npm start
```
The backend starts at `http://localhost:5000`. Verify health at `http://localhost:5000/api/health`.

### Frontend Installation & Startup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# Or start development server
npm run dev
```
The frontend is available at `http://localhost:3000`.

---

## CLI Commands

All commands can be executed directly from the project root:

### Batch Evaluator CLI
Evaluates an input file containing multiple interview kit cases and writes the output according to the TRAO Appendix B JSON specification:

```bash
# From project root:
npm run evaluate -- --input cases/sample.json --output cases/output.json

# Or directly with node:
node scripts/evaluate.js cases/sample.json cases/output.json
```

### Automated Test Suite
Runs the 16-test invariant suite covering schedule math, coverage completeness, structural checks, and pipeline resilience:

```bash
# From project root:
npm test

# Or from backend directory:
npm --prefix backend test
```

---

## API Specification

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account (`email`, `password`) | No |
| `POST` | `/api/auth/login` | Login user and establish session cookie | No |
| `POST` | `/api/auth/logout` | Destroy current session and clear cookie | Yes |
| `GET` | `/api/auth/me` | Return currently logged-in user profile | Yes |

### Interview Kits (`/api/kits`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/kits` | Create new interview kit draft (`title`, `jobDescription`, `companyUrl`, `days`) | Yes |
| `GET` | `/api/kits` | List all kits belonging to logged-in user | Yes |
| `GET` | `/api/kits/:id` | Get full details for a kit | Yes |
| `PATCH` | `/api/kits/:id` | Update kit title, brief, role breakdown, or requirements | Yes |
| `POST` | `/api/kits/:id/generate` | Trigger full AI pipeline generation | Yes |

### Kit Builder & Question Management
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/kits/:id/questions` | Add custom user question to question bank | Yes |
| `PATCH` | `/api/kits/:id/questions/:qId` | Update question text, category, duration, outline, or pin status | Yes |
| `DELETE` | `/api/kits/:id/questions/:qId` | Delete question (cascades to flashcards & schedule) | Yes |
| `PUT` | `/api/kits/:id/questions/reorder` | Reorder questions in question bank | Yes |
| `PATCH` | `/api/kits/:id/flashcards/:fcId` | Update flashcard content or confidence rating (`low`, `medium`, `high`) | Yes |

### Selective AI Regeneration
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/kits/:id/regenerate/brief` | Regenerate company overview & role breakdown | Yes |
| `POST` | `/api/kits/:id/regenerate/questions/:category` | Regenerate specific question category (preserves pinned/edited) | Yes |
| `POST` | `/api/kits/:id/regenerate/schedule` | Recalculate schedule days based on current questions | Yes |

---

## Security & Production Readiness

1. **SSRF Protection**:
   - Company URL validation strictly enforces HTTP/HTTPS protocols.
   - Private, internal, and link-local IP addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `localhost`, `0.0.0.0`) are blocked before making outbound requests.
2. **Strict Session Security**:
   - Sessions are stored server-side in MongoDB via `connect-mongo`.
   - Session cookies utilize `httpOnly: true` (preventing XSS theft) and `sameSite: 'lax'`.
   - Passwords hashed with `bcryptjs` using automatic salt generation.
3. **Data Isolation**:
   - Queries enforce user ownership scoping on every kit mutation. Attempts to access or edit another user's kit return `403 Forbidden` or `404 Not Found`.
4. **Input Sanitization**:
   - HTML stripping and trim routines on all user text inputs and crawled webpage contents.
5. **No Hallucination Architecture**:
   - The extraction and question generation engines ground outputs in verifiable requirements directly from the provided JD.

---

## Design Decisions & Trade-Offs

- **Unified Pipeline Engine (`pipelineEngine.js`)**:
  Both the web application backend (`POST /api/kits/:id/generate`) and the batch evaluator CLI (`node scripts/evaluate.js`) share the exact same core pipeline engine. This eliminates code drift between interactive web sessions and automated assessment grading.
- **Deterministic Scheduling**:
  Instead of non-deterministic LLM schedule generation that risks uneven distribution or missed days, schedule allocation uses a greedy bin-packing algorithm that guarantees every single day (from 1 to 60) receives appropriate study time, with critical must-haves prioritized first.
- **Heuristic Fallback vs External LLM API Keys**:
  To guarantee that the assessment can be evaluated out-of-the-box in offline or budget-constrained environments without requiring paid external API credentials (OpenAI/Anthropic), the pipeline includes an intelligent keyword/NLP extraction engine that deterministically produces rich, grounded questions. An external LLM adapter can be configured with zero schema changes.

---

## Known Limitations

- **Web Crawler JavaScript Execution**: The lightweight crawler uses standard HTTP fetch and regex/HTML parsers. Complex Single Page Applications (SPAs) that render exclusively via client-side JavaScript may yield minimal text, triggering the fallback JD-grounded research pipeline.
- **Synchronous vs Asynchronous Queueing**: For small-scale usage, background execution via Promises is fast and simple. In an enterprise production deployment, a distributed Redis-backed queue (such as BullMQ) with dedicated worker nodes would be recommended for multi-tenant throughput.
