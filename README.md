# AI Interview Prep Kit

> **Note**: This application is being developed incrementally. This repository currently reflects **Stage 1: Foundation Setup**.

## Overview

The AI Interview Prep Kit is a full-stack platform designed to prepare candidates for technical and behavioural interviews. Stage 1 establishes the foundational scaffolding for both the frontend and backend architectures, including database configuration and health checking.

## Technology Stack

- **Frontend**: Next.js (App Router, JavaScript), Tailwind CSS, ESLint
- **Backend**: Node.js, Express, Mongoose (MongoDB ODM), CORS, Dotenv
- **Database**: MongoDB (via Mongoose)

## Project Structure

```text
ai-interview-prep/
├── frontend/             # Next.js frontend application
├── backend/              # Node.js + Express backend application
│   └── src/
│       ├── config/       # Database and app configuration
│       ├── controllers/  # Route request handlers
│       ├── middleware/   # Express middleware
│       ├── models/       # Mongoose models (future stages)
│       ├── routes/       # API routes
│       ├── services/     # Business logic layer (future stages)
│       ├── utils/        # Utility helpers (future stages)
│       └── server.js     # Express server entry point
├── cases/                # Case studies and evaluation data
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── README.md             # Project documentation
```

## Local Installation

### Prerequisites

- Node.js (v18+ or v20+ recommended)
- npm (v9+)
- MongoDB (optional for Stage 1 health verification)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `backend/.env` (or project root) and adjust values as needed:
   ```bash
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai_interview_prep
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development Commands

### Running the Backend

From the `backend` directory:

```bash
# Start development server with live reload (nodemon)
npm run dev

# Start production server
npm start
```

Backend will be running at `http://localhost:5000`.
Health endpoint: `GET http://localhost:5000/api/health`.

### Running the Frontend

From the `frontend` directory:

```bash
# Start Next.js development server
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Run ESLint
npm run lint
```

Frontend will be accessible at `http://localhost:3000`.
