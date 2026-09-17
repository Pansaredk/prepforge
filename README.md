# PrepForge – AI Interview Preparation Kit

PrepForge is a full-stack AI-powered interview preparation platform that transforms a **job description and company website** into a structured, editable interview preparation kit.

The project was built for the **Trao Full-Stack AI Interview Assessment** and focuses on reliable AI generation, deterministic scheduling and coverage, user isolation, research/crawling, editable preparation content, and automated evaluation.

---

## 🚀 Live Demo

**Frontend:**
https://prepforge-phi.vercel.app

**Backend API:**
https://prepforge-backend-a05r.onrender.com

> The backend may take some time to wake up on the first request because it is deployed on a free-tier hosting environment.

---

## 📌 Assessment

**Assessment ID:** `FS-AI-INTERVIEW-01`

### Core workflow

```text
Job Description
       +
Company URL
       +
Preparation Days
       ↓
Company Research
       ↓
JD & Requirement Extraction
       ↓
Role & Skill Analysis
       ↓
Question Generation
       ↓
Flashcards
       ↓
Coverage Validation
       ↓
Deterministic Study Schedule
       ↓
Interactive Interview Kit
```

---

# ✨ Key Features

## 1. Authentication & User Isolation

* User registration and login
* Password hashing using `bcryptjs`
* Session-based authentication
* MongoDB-backed sessions using `connect-mongo`
* HttpOnly authentication cookies
* User-specific interview kits
* Protected API routes
* Users can only access their own kits

### Production cookie configuration

Because the frontend and backend are deployed on different domains, production authentication uses:

```text
HttpOnly
Secure
SameSite=None
```

This allows the browser to send the session cookie between the Vercel frontend and Render backend while keeping the cookie inaccessible to client-side JavaScript.

---

# 2. 🤖 AI Interview Preparation Pipeline

PrepForge processes a job description and company information through a structured pipeline.

### Pipeline stages

1. Validate user input
2. Validate company URL
3. Crawl company website
4. Extract useful company information
5. Extract job requirements
6. Separate must-have and nice-to-have requirements
7. Analyze role and skills
8. Generate interview questions
9. Generate flashcards
10. Validate requirement coverage
11. Generate deterministic study schedule
12. Store the completed kit

AI-generated content uses the configured **Google Gemini model**.

The application also uses deterministic processing where predictable results are more appropriate, particularly for:

* Requirement IDs
* Requirement classification
* Coverage calculation
* Schedule allocation
* Validation
* Evaluator output structure

This reduces unnecessary dependence on LLM output for logic that can be handled deterministically.

---

# 3. 🏢 Company Research & Crawling

PrepForge accepts a company website URL and performs research dynamically instead of depending on hard-coded company paths.

The crawler:

* Validates URLs before requesting them
* Blocks unsafe/private network targets
* Attempts to respect `robots.txt`
* Handles request failures
* Applies timeout and retry/backoff behaviour
* Continues when individual sources fail
* Extracts relevant page content
* Treats crawled webpage content as untrusted input

The system is designed to continue the preparation pipeline even when some company pages cannot be accessed.

### Example research output

```text
Company Brief
├── Company overview
├── Products / services
├── Industry
├── Technology information
└── Relevant company context

Role Breakdown
├── Role summary
├── Responsibilities
├── Required skills
└── Nice-to-have skills
```

---

# 4. 📝 Interactive Kit Builder

Generated content is not treated as read-only.

Users can:

* Edit generated content
* Add questions
* Delete questions
* Reorder questions
* Pin important questions
* Edit flashcards
* Regenerate individual sections
* Preserve manually edited content during regeneration

This makes the application useful as an actual preparation tool rather than only an AI content generator.

---

# 5. 🧠 Practice Mode & Active Recall

PrepForge includes an interactive flashcard practice experience.

Users can:

* Practice generated flashcards
* Mark confidence levels
* Track weaker topics
* Prioritize weaker cards
* Review cards repeatedly

The practice flow is designed around **active recall** rather than simply displaying generated content.

---

# 6. 📅 Deterministic Study Schedule

The preparation schedule is generated from:

* Number of preparation days
* Interview requirements
* Requirement priority
* Estimated study time
* Coverage requirements

Schedule generation is deterministic rather than asking the LLM to decide the final day-by-day allocation.

This provides predictable and testable scheduling behaviour.

---

# 7. 🧪 Automated Verification Suite

The project contains automated tests for important application invariants.

The test suite validates areas such as:

* Kit structure
* Requirement IDs
* Must-have / nice-to-have classification
* Requirement coverage
* Schedule allocation
* Edge cases
* Data structure consistency

Run:

```bash
npm test
```

---

# 8. 📦 Batch Evaluation Engine

PrepForge provides the required evaluation command:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Example:

```bash
npm run evaluate -- --input cases/sample.json --output kits.json
```

The evaluator uses the same core preparation pipeline used by the application.

It supports processing multiple cases and is designed to continue processing when an individual case encounters an error.

---

# 🏗️ Architecture

```text
┌───────────────────────────────┐
│        Next.js Frontend       │
│                               │
│  Authentication              │
│  Kit Creation                │
│  Kit Builder                 │
│  Practice Mode               │
│  Progress / Error UI         │
└───────────────┬───────────────┘
                │
                │ REST API
                ▼
┌───────────────────────────────┐
│       Node.js + Express       │
│                               │
│  Authentication              │
│  Session Management          │
│  Kit APIs                    │
│  Research / Crawling         │
│  AI Generation               │
│  Validation                  │
│  Pipeline Engine             │
└───────────────┬───────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌───────────────┐  ┌────────────────┐
│ MongoDB       │  │ Gemini LLM     │
│               │  │                │
│ Users         │  │ AI generation  │
│ Sessions      │  │ Question       │
│ Interview Kits│  │ Flashcards     │
└───────────────┘  └────────────────┘

                │
                ▼
┌───────────────────────────────┐
│   Deterministic Pipeline      │
│                               │
│ Requirement IDs              │
│ Coverage                     │
│ Schedule                     │
│ Validation                   │
└───────────────────────────────┘

                │
                ▼
┌───────────────────────────────┐
│      Batch Evaluator          │
│                               │
│ cases.json → kits.json        │
└───────────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* Next.js 14
* React 18
* Tailwind CSS
* JavaScript
* Heroicons

## Backend

* Node.js
* Express.js
* JavaScript
* REST APIs

## Database

* MongoDB
* Mongoose
* MongoDB Atlas for production

## Authentication

* Express Session
* connect-mongo
* bcryptjs
* HttpOnly cookies

## AI

* Google Gemini
* Configurable LLM model through environment variables

## Development Tools

* Git
* GitHub
* VS Code
* Postman
* Vercel
* Render

---

# 📁 Project Structure

```text
prepforge/
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── kits/
│   │   ├── login/
│   │   ├── register/
│   │   └── ...
│   │
│   ├── components/
│   ├── lib/
│   │   └── api.js
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   ├── crawler/
│   ├── pipeline/
│   ├── server.js
│   └── package.json
│
├── scripts/
│   ├── evaluate.js
│   └── test.js
│
├── cases/
│   └── sample.json
│
├── .env.example
├── package.json
└── README.md
```

> The exact internal file structure may evolve as the application is developed; the main separation is between the Next.js frontend, Express backend, pipeline/evaluation logic, and configuration.

---

# ⚙️ Getting Started

## Prerequisites

Install:

* Node.js 18+
* npm
* MongoDB local instance or MongoDB Atlas
* Git

An API key for the configured Gemini model is required for AI generation.

---

## 1. Clone the repository

```bash
git clone https://github.com/Pansaredk/prepforge.git
cd prepforge
```

---

# 2. Backend Setup

```bash
cd backend
npm install
```

Create:

```text
backend/.env
```

Example:

```env
PORT=5000

MONGODB_URI=mongodb://localhost:27017/ai_interview_prep

SESSION_SECRET=your_secure_random_secret

LLM_API_KEY=your_gemini_api_key
LLM_MODEL=gemini-1.5-flash

NODE_ENV=development

CLIENT_URL=http://localhost:3000
```

For production, `MONGODB_URI` should point to MongoDB Atlas.

Start the backend:

```bash
npm start
```

Backend:

```text
http://localhost:5000
```

---

# 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# 🔐 Environment Variables

## Backend

| Variable         | Purpose                           |
| ---------------- | --------------------------------- |
| `PORT`           | Express server port               |
| `MONGODB_URI`    | MongoDB connection string         |
| `SESSION_SECRET` | Session encryption/signing secret |
| `LLM_API_KEY`    | Gemini API key                    |
| `LLM_MODEL`      | Configured Gemini model           |
| `NODE_ENV`       | Application environment           |
| `CLIENT_URL`     | Allowed frontend origin           |

## Frontend

| Variable              | Purpose              |
| --------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

### Production configuration

The deployed frontend points to the Render backend:

```text
NEXT_PUBLIC_API_URL=<production-backend>/api
```

The backend allows the deployed Vercel frontend through:

```text
CLIENT_URL=<production-frontend>
```

Secrets must never be committed to Git.

---

# 🧪 Running Tests

From the project root:

```bash
npm test
```

The verification suite checks deterministic application invariants and important edge cases.

---

# 📊 Running the Evaluator

The required evaluator command is:

```bash
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Example:

```bash
npm run evaluate -- --input cases/sample.json --output kits.json
```

The evaluator:

1. Reads the input cases.
2. Processes each case through the preparation pipeline.
3. Generates the corresponding interview kit.
4. Continues processing after recoverable failures.
5. Writes the resulting kits to the specified output file.

---

# 🔌 API Overview

The backend exposes REST APIs for:

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Interview Kits

```text
POST   /api/kits
GET    /api/kits
GET    /api/kits/:id
PUT    /api/kits/:id
DELETE /api/kits/:id
```

### Generation / Preparation

The kit generation APIs handle:

* Company research
* JD analysis
* Requirement extraction
* Question generation
* Flashcard generation
* Schedule generation
* Section regeneration

The frontend communicates with these APIs through the centralized API client.

---

# 🔒 Security & Production Readiness

## Authentication

* Passwords are hashed using `bcryptjs`.
* Authentication uses server-side sessions.
* Session data is stored in MongoDB.
* Authentication cookies are HttpOnly.
* Production cookies use `Secure`.
* Production cross-site authentication uses `SameSite=None`.

## Authorization

Protected resources verify the authenticated user before accessing interview kits.

A user cannot access another user's kit simply by changing a kit ID.

## CORS

The backend uses an explicit allow-list for frontend origins and enables credentials for session-based authentication.

## URL Validation

Company URLs are validated before crawling.

The application includes protection against requests targeting private or loopback network addresses.

## Secrets

API keys and session secrets are provided through environment variables.

They are not stored in source code or committed to Git.

## Untrusted Web Content

Company webpages are treated as external/untrusted data.

Web content is not treated as trusted application instructions.

---

# 🧠 Design Decisions & Trade-offs

## Why session authentication?

Server-side sessions were selected instead of storing JWTs in browser storage.

Benefits:

* HttpOnly cookies
* Server-controlled sessions
* Easy session invalidation
* No authentication token stored in `localStorage`

---

## Why deterministic scheduling?

LLMs are useful for generating content but are not ideal for enforcing exact scheduling rules.

Therefore:

```text
LLM
 ↓
Content generation

Deterministic code
 ↓
Coverage + scheduling + validation
```

This makes the final schedule predictable and easier to test.

---

## Why allow editing generated content?

AI-generated content may require correction or personalization.

The kit therefore supports:

* Editing
* Adding
* Deleting
* Reordering
* Pinning

The user remains in control of the final preparation material.

---

## Why selective regeneration?

Regenerating an entire kit could overwrite useful user edits.

The application therefore supports section-level regeneration while preserving user-managed content where applicable.

---

# 🌐 Deployment

## Frontend

Deployed using:

**Vercel**

The frontend is a Next.js application.

## Backend

Deployed using:

**Render**

The backend runs the Node.js/Express API.

## Database

Production data is stored in:

**MongoDB Atlas**

## AI

AI generation uses the configured Gemini API model through a server-side environment variable.

The Gemini API key is never exposed to the frontend.

---

# ⚠️ Known Limitations

### 1. Web crawling

The crawler primarily processes accessible server-rendered webpage content.

Highly dynamic JavaScript-heavy websites may not expose all useful content to the crawler.

### 2. Free-tier hosting

The deployed backend uses a free-tier hosting environment, so cold starts may increase the first request latency.

### 3. AI variability

LLM-generated questions and explanations can vary between generations.

The application therefore uses deterministic validation, coverage, and scheduling logic wherever predictable behaviour is required.

### 4. Large-scale processing

The current generation workflow is suitable for the assessment scope.

A production-scale system with many simultaneous users would benefit from a background job/queue architecture for long-running generation tasks.

---

# 🧩 Assessment Requirement Coverage

| Requirement            | Implementation                                |
| ---------------------- | --------------------------------------------- |
| User authentication    | Session-based authentication                  |
| User isolation         | Authenticated ownership checks                |
| JD input               | Supported                                     |
| Company URL input      | Supported                                     |
| Preparation days       | Supported                                     |
| Batch inputs           | Supported through evaluator                   |
| Company research       | Dynamic crawling                              |
| Failure handling       | Pipeline continues after recoverable failures |
| Company brief          | Generated                                     |
| Role breakdown         | Generated                                     |
| Question bank          | Generated                                     |
| Flashcards             | Generated                                     |
| Editable content       | Supported                                     |
| Reordering             | Supported                                     |
| Add/Delete             | Supported                                     |
| Pinning                | Supported                                     |
| Section regeneration   | Supported                                     |
| Practice mode          | Supported                                     |
| Confidence tracking    | Supported                                     |
| Weak-first review      | Supported                                     |
| Deterministic coverage | Supported                                     |
| Deterministic schedule | Supported                                     |
| Batch evaluator        | Supported                                     |
| Automated tests        | Supported                                     |
| Production frontend    | Vercel                                        |
| Production backend     | Render                                        |
| Production database    | MongoDB Atlas                                 |

---

# 📈 Future Improvements

Possible extensions beyond the assessment scope:

* Background job queue for long-running generation
* Real-time progress using WebSockets or Server-Sent Events
* More advanced website crawling
* Resume upload and resume-vs-JD analysis
* Mock interview mode
* Interview performance analytics
* Weak-topic reports
* Printable interview preparation sheets
* Company comparison
* More LLM provider options

---

# 👩‍💻 Author

**Divya Pansare**

Interested in:

* MERN Stack Development
* Python
* AI/ML
* Full-Stack Development

---

# 📄 License

This project was developed as part of a technical assessment and portfolio work.
