# 🎓 Quizora — Production Competitive Examination MCQ Platform

<div align="center">

**A modern, server-authoritative Computer-Based Testing (CBT) and MCQ practice platform designed for serious competitive examination preparation.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20Storage-emerald?logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Verification%20Tests-166%20%2F%20166%20Passed-emerald)](#automated-verification-suites)
[![Turbopack](https://img.shields.io/badge/Turbopack-1.2s%20Build-purple)](#production-build)

</div>

---

## 📌 Table of Contents
1. [Overview & Supported Examinations](#-overview--supported-examinations)
2. [Core Architectural Principles](#-core-architectural-principles)
3. [File & Folder Structure](#-file--folder-structure)
4. [Phase-by-Phase Implementation Journey](#-phase-by-phase-implementation-journey)
   - [Phase 1: Foundation, Schema & Data Models](#phase-1-foundation-schema--data-models)
   - [Phase 2: Question Bank & Content Authoring](#phase-2-question-bank--content-authoring)
   - [Phase 3: Bulk Import Engine (CSV, XLSX, ZIP)](#phase-3-bulk-import-engine-csv-xlsx-zip)
   - [Phase 4: Examination Test Builder](#phase-4-examination-test-builder)
   - [Phase 5: CBT Quiz Engine & Server Scoring](#phase-5-cbt-quiz-engine--server-authoritative-scoring)
   - [Phase 6: Results, Analytics & Review](#phase-6-results-analytics--review)
   - [Phase 7: Student Dashboard & Learning Hub](#phase-7-student-dashboard--learning-hub)
   - [Phase 8: Security, RLS & Mobile Polish](#phase-8-security-rls-audit--mobile-polish)
5. [Automated Verification Suites (166 / 166 Passed)](#-automated-verification-suites)
6. [Technology Stack](#-technology-stack)
7. [Getting Started & Local Setup](#-getting-started--local-setup)

---

## 🚀 Overview & Supported Examinations

Quizora is built from the ground up as a serious educational product rather than a generic CRUD demo. It simulates realistic, timed Computer-Based Testing (CBT) environments with server-authoritative timers, negative marking, instant recovery on page refreshes, and deep diagnostic analytics.

### Supported Competitive Examinations:
- **Bihar STET** (Secondary Teachers Eligibility Test — Computer Science & General Pedagogy)
- **CTET** (Central Teacher Eligibility Test)
- **SSC CGL & CHSL** (Staff Selection Commission)
- **Railway RRB NTPC & Group D**
- **Banking** (IBPS PO/Clerk, SBI PO)
- **UPSC & State PSCs** (Civil Services Preliminary GS & CSAT)
- **GATE CS & IT** (Computer Science & Engineering)

---

## 🏛️ Core Architectural Principles

1. **Single-Record Question Schema (Zero Anti-Patterns)**:
   - Each question is stored as a single row in `questions`.
   - Options are stored in a flexible `options JSONB` array of 4 or 5 items: `[{ "text": string | null, "image_path": string | null }]`.
   - Correct answer is stored as an integer `correct_option` (1 to 5).
   - **Strict Anti-Pattern Rule**: No separate `question_options` join table, and no `option_a..e` column sprawl.
   - Enforced by PostgreSQL constraint function: `validate_question_options()`.

2. **Historical Attempt Immutability**:
   - When a student starts an attempt, complete frozen snapshots of every question (`QuestionSnapshot`) are copied into `attempt_questions.question_snapshot JSONB`.
   - If administrators edit question wording, diagrams, or answer keys in the question bank later, historical scores and review scorecards remain 100% immutable and faithful to the moment of examination.

3. **Server-Authoritative Timing & Grading**:
   - The test countdown timer is computed on the server: `duration_seconds - (now - started_at)`.
   - Tamper-proof: client cannot manipulate timers or inject answers after expiration.
   - Grading evaluates user selections strictly against server snapshots.

4. **Zero-Error Engineering Standard**:
   - 0 TypeScript compiler errors (`tsc --noEmit`).
   - 0 ESLint warnings (`eslint`).
   - 166 automated verification tests covering all 8 phases.
   - Turbopack production builds compile all 21 routes in ~1.2s.

---

## 📂 File & Folder Structure

```
Quizora/
├── public/                          # Static assets and icons
│   └── logo.svg                     # SVG Brand mark
├── scripts/                         # Phase-by-phase automated verification test suites
│   ├── verify-phase1.ts             # Schema, Zod & validation unit tests (13 tests)
│   ├── verify-phase2.ts             # Question CRUD, option E, and media filter tests (12 tests)
│   ├── verify-phase3.ts             # CSV, XLSX, ZIP image parser & duplicate tests (12 tests)
│   ├── verify-phase4.ts             # Test builder, sequential order & timer tests (7 tests)
│   ├── verify-phase5.ts             # Scoring engine, timer countdown & snapshot tests (34 tests)
│   ├── verify-phase6.ts             # Analytics, pacing, cutoff, bookmarks & reports (25 tests)
│   ├── verify-phase7.ts             # Streak, recommendations, mistakes & history (34 tests)
│   ├── verify-phase8.ts             # PostgreSQL RLS audit, storage & architecture (29 tests)
│   └── verify-sql.ts                # Migration validation and DDL integrity checks
├── supabase/
│   └── migrations/                  # Versioned PostgreSQL DDL & security migrations
│       ├── 20260908000001_initial_schema.sql  # 11 core tables, validation functions, indexes
│       ├── 20260908000002_storage_and_rls.sql # RLS policies, profiles trigger, storage bucket
│       └── 20260908000003_seed_data.sql       # Bihar STET, subjects, topics, 5 sample questions
├── src/
│   ├── app/                         # Next.js App Router (21 Static & Dynamic Routes)
│   │   ├── admin/                   # Admin Console
│   │   │   ├── exams/page.tsx       # 3-column Taxonomy Manager (Exams, Subjects, Topics)
│   │   │   ├── imports/             # Bulk Importer
│   │   │   │   ├── actions.ts       # Server Actions for file parsing and batch insert
│   │   │   │   └── page.tsx         # Drag-and-drop import UI with error inspections
│   │   │   ├── questions/           # Question Bank Management
│   │   │   │   ├── [id]/edit/       # Edit Question route
│   │   │   │   ├── new/             # Create Question route
│   │   │   │   ├── actions.ts       # Question CRUD Server Actions
│   │   │   │   └── page.tsx         # Question Bank table with multi-filters
│   │   │   ├── tests/               # Test Builder Management
│   │   │   │   ├── [id]/edit/       # Edit Test route
│   │   │   │   ├── new/             # Create Test route
│   │   │   │   ├── actions.ts       # Test Builder Server Actions
│   │   │   │   └── page.tsx         # Test catalog & status toggle
│   │   │   └── page.tsx             # Admin analytics summary overview
│   │   ├── bookmarks/               # Student Saved Questions Hub
│   │   │   └── page.tsx             # Filterable bookmarked questions repository
│   │   ├── dashboard/               # Student Learning Headquarters
│   │   │   ├── actions.ts           # Dashboard Server Actions
│   │   │   └── page.tsx             # Recommendations, streak counter & stats
│   │   ├── history/                 # Test Attempt History
│   │   │   └── page.tsx             # Chronological audit log of all attempts
│   │   ├── mistakes/                # Error Remediation Hub
│   │   │   └── page.tsx             # Past incorrect & skipped questions with re-attempt CTA
│   │   ├── practice/                # Targeted Practice Mode
│   │   │   ├── results/[attemptId]/ # Practice session scorecards
│   │   │   └── page.tsx             # Adaptive practice setup and test runner
│   │   ├── tests/                   # Mock Tests Hub
│   │   │   ├── [slug]/              # Single Mock Test Overview & Instructions
│   │   │   │   ├── attempt/         # Fullscreen CBT examination environment
│   │   │   │   ├── results/[attemptId]/ # Comprehensive Scorecard, Analytics & Review
│   │   │   │   └── page.tsx         # Test instruction sheet and syllabus breakdown
│   │   │   ├── actions.ts           # Student attempt & answer server actions
│   │   │   └── page.tsx             # Mock test catalog with exam tabs
│   │   ├── globals.css              # Tailwind CSS styles & typography variables
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Modern student landing portal
│   ├── components/
│   │   ├── admin/                   # Admin UI Components
│   │   │   ├── AdminSidebar.tsx     # Responsive admin navigation
│   │   │   ├── BulkImporter.tsx     # CSV/XLSX/ZIP drag-and-drop validation UI
│   │   │   ├── ModernPagination.tsx # Accessible pagination controls
│   │   │   └── TestBuilder.tsx      # Sequential question picker and reorder UI
│   │   ├── bookmarks/
│   │   │   └── BookmarksClient.tsx  # Bookmark cards with solutions & practice trigger
│   │   ├── dashboard/
│   │   │   ├── DashboardClient.tsx  # Dashboard master coordinator
│   │   │   ├── DashboardHero.tsx    # "What should I practice today?" recommendation card
│   │   │   ├── DashboardStatsCards.tsx # 4 key metrics (Tests, Questions, Accuracy, Time)
│   │   │   ├── RecentAttemptsCard.tsx  # Recent scorecards with resume links
│   │   │   └── TopicWeaknessList.tsx   # Priority improvement topics with 1-click practice
│   │   ├── history/
│   │   │   └── HistoryClient.tsx    # Attempt table with filters and scorecard review
│   │   ├── layout/
│   │   │   └── StudentHeader.tsx    # Responsive student navbar with mobile drawer
│   │   ├── media/
│   │   │   ├── ImageLightbox.tsx    # High-resolution modal for complex exam diagrams
│   │   │   └── ImageUploader.tsx    # Drag-and-drop image upload with 5MB MIME check
│   │   ├── mistakes/
│   │   │   └── MistakesClient.tsx   # Mistake cards with wrong vs correct answer comparison
│   │   ├── questions/
│   │   │   ├── QuestionEditor.tsx   # Question authoring suite (Dynamic Option E, live preview)
│   │   │   └── QuestionPreview.tsx  # Authentic 4/5 option renderer with student/admin modes
│   │   ├── quiz/
│   │   │   ├── QuestionPalette.tsx  # NTA-pattern question status palette (Answered, Review, etc.)
│   │   │   ├── QuizEngine.tsx       # Master CBT orchestrator (Timer, autosave, keyboard shortcuts)
│   │   │   ├── QuizQuestionView.tsx # Statement, diagram, options, and action controls
│   │   │   ├── QuizSubmitModal.tsx  # Confirmation modal with unanswered warning
│   │   │   └── QuizTimer.tsx        # Drift-free countdown timer with urgency styling
│   │   ├── results/
│   │   │   ├── AnalyticsCharts.tsx  # Recharts topic accuracy bar chart & pacing diagnostic cards
│   │   │   ├── QuestionReportModal.tsx # Academic defect reporting modal
│   │   │   ├── QuestionReviewList.tsx  # Filterable question review with explanation narratives
│   │   │   ├── ScorecardHero.tsx    # Net score, cutoff tier, and "Practice Missed Questions" CTA
│   │   │   └── TestResultsView.tsx  # Unified scorecard container
│   │   └── ui/                      # Base Design System primitives (Buttons, Cards, Modals, Inputs)
│   ├── lib/
│   │   ├── imports/
│   │   │   └── clientParser.ts      # In-browser parser for CSV, XLSX, and ZIP image bundles
│   │   ├── quiz/
│   │   │   ├── analytics.ts         # Diagnostic engine (Cutoff probability, Topic mastery, Pacing)
│   │   │   └── scoring.ts           # Server-authoritative grading and negative marking calculator
│   │   ├── supabase/
│   │   │   ├── admin.ts             # Backend service-role Supabase client
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   ├── middleware.ts        # Edge auth session refresher
│   │   │   └── server.ts            # Server Component & Server Action Supabase client
│   │   └── utils.ts                 # Tailwind cn() and storage URL helpers
│   ├── schemas/                     # Zod runtime validation schemas
│   │   ├── question.ts              # 4/5 option validation, option E bounds, import row schema
│   │   └── test.ts                  # Test builder metadata & attempt submission schemas
│   ├── services/                    # Database & business logic layer (Supabase + fallback)
│   │   ├── attempts.ts              # Attempt initialization, autosave, submission & remediation
│   │   ├── bookmarks.ts             # Bookmark toggling and question saving
│   │   ├── dashboard.ts             # Dashboard stats, streak calculator, mistakes & history
│   │   ├── exams.ts                 # Exam taxonomy operations
│   │   ├── imports.ts               # Bulk import parser, duplicate detector & batch committer
│   │   ├── media.ts                 # Supabase Storage media upload & validation
│   │   ├── mockData.ts              # Seed exams, subjects, topics, and question bank
│   │   ├── questions.ts             # Question CRUD, multi-filter search, duplicate & archive
│   │   ├── reports.ts               # Question issue reporting & moderation
│   │   ├── subjects.ts              # Subject syllabus categorizations
│   │   ├── tests.ts                 # Test builder, sequential question order & status lifecycle
│   │   └── topics.ts                # Topic taxonomy management
│   └── types/
│       ├── database.ts              # TypeScript domain types & QuestionSnapshot definition
│       └── quiz.ts                  # AttemptWithDetails, AttemptScoreSummary, and ScoredQuestionResult
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 🛠️ Phase-by-Phase Implementation Journey

### Phase 1: Foundation, Schema & Data Models
- **PostgreSQL Migrations** (`supabase/migrations/`):
  - **`20260908000001_initial_schema.sql`**: Created 11 core tables (`profiles`, `exams`, `subjects`, `topics`, `questions`, `tests`, `test_questions`, `attempts`, `attempt_questions`, `bookmarks`, `question_reports`).
  - **Single Question Record**: Designed questions with `options JSONB` (4 or 5 options) and `correct_option INTEGER`. Created the PostgreSQL integrity function `validate_question_options()` to strictly enforce option count, integer bounds, and non-empty text/image presence.
  - **Historical Attempt Snapshot**: Designed `attempt_questions.question_snapshot JSONB` to freeze question state at the moment an attempt starts.
  - **`20260908000002_storage_and_rls.sql`**: Enabled Row Level Security (RLS) on all 11 tables. Created storage bucket `quizora-media` (5MB limit, JPEG/PNG/WebP). Defined `is_admin()` and auto-profile provisioning trigger `handle_new_user()`.
  - **`20260908000003_seed_data.sql`**: Seeded Bihar STET Computer Science syllabus with 5 representative questions demonstrating text-only, diagram questions, and 4-vs-5 options.
- **Verification**: `scripts/verify-phase1.ts` (13/13 passed).

---

### Phase 2: Question Bank & Content Authoring
- **Interactive Question UI**:
  - `QuestionEditor.tsx`: Cascaded Exam $\to$ Subject $\to$ Topic picker, question statement input, diagram upload, radio selector for correct answer, marks, and negative marks.
  - **Dynamic Option E Handling**: Built "+ Add Option E" and "Remove Option E" buttons. Never hardcodes 5 options and never creates empty options.
  - `QuestionPreview.tsx`: Exam-authentic rendering supporting Student Mode (interactive choice) and Admin Mode (emerald correct answer badge + explanation).
  - `ImageLightbox.tsx`: Full-screen modal viewer ensuring complex figures, flowcharts, circuits, and code snippets are viewed without distortion.
- **Question Services**: Full CRUD, search, pagination, duplication (creates clean draft clone), and archiving in `src/services/questions.ts`.
- **Admin Console**: Built `/admin`, `/admin/questions`, `/admin/questions/new`, `/admin/questions/[id]/edit`, and `/admin/exams`.
- **Verification**: `scripts/verify-phase2.ts` (12/12 passed).

---

### Phase 3: Bulk Import Engine (CSV, XLSX, ZIP)
- **Multi-Format Ingestion**:
  - `src/services/imports.ts` & `src/lib/imports/clientParser.ts`: Ingests CSV spreadsheets, Excel `.xlsx` files, and `.zip` archives containing an Excel/CSV file plus an `images/` directory.
  - **Option Letter Normalization**: Normalizes inputs `A`, `B`, `C`, `D`, `E` or `1..5` into numeric indices (1..5).
  - **In-Memory ZIP Parser**: JSZip extracts diagram images into memory and automatically maps them to question image paths.
  - **Duplicate Detection**: Computes normalized text hashes against existing questions to flag duplicate entries.
  - **Sample Template Generator**: One-click download of standard CSV template with pre-filled examples.
- **Admin Import UI** (`/admin/imports`): Drag-and-drop dropzone, validation metrics summary card (Total, Valid, Errors, Duplicates, Attached Images), and row-by-row error inspector.
- **Verification**: `scripts/verify-phase3.ts` (12/12 passed).

---

### Phase 4: Examination Test Builder
- **Test Management Architecture**:
  - `src/services/tests.ts`: Test lifecycle operations (`draft` $\to$ `published` $\to$ `archived`).
  - **Sequential Ordering**: Question sequence numbers (1..N) stored in `test_questions.question_order` with dynamic up/down reordering.
  - **Dual Timer Flexibility**: Supports **Full Test Countdown** (e.g., 60–180 minutes) or rapid **Per-Question Timers** (e.g., 30–60 seconds).
  - **Scoring & Shuffle Controls**: Marks per question, negative marks, question shuffle, option shuffle, immediate result toggle, and explanation visibility.
- **Admin Test Builder UI** (`/admin/tests/new`, `/admin/tests/[id]/edit`): Split-pane test builder with catalog picker on the left and ordered question pool with up/down controls on the right.
- **Verification**: `scripts/verify-phase4.ts` (7/7 passed).

---

### Phase 5: CBT Quiz Engine & Server-Authoritative Scoring
- **Scoring & Engine Core**:
  - `src/lib/quiz/scoring.ts`: Server-authoritative calculator evaluating student answers against immutable snapshots. Deducts negative marks for wrong answers; awards 0 for skipped questions.
  - `src/services/attempts.ts`:
    - `startAttempt()`: Checks for existing active attempt to prevent duplicate tests; copies question snapshots.
    - `calculateRemainingSeconds()`: Server-authoritative countdown preventing client manipulation.
    - `saveAnswer()`: Continuous autosave of selected option, marked-for-review flag, and time spent.
    - `submitAttempt()`: Idempotent evaluation generating final scores and transition to `completed`.
- **Exam-Hall CBT Interface**:
  - `QuizTimer.tsx`: Visual urgency countdown (Green $\to$ Amber < 5 mins $\to$ Red pulse < 1 min) with auto-submission on expiration.
  - `QuestionPalette.tsx`: NTA/GATE competitive exam question palette (Answered: Green, Not Answered: Slate, Marked for Review: Purple, Answered & Marked: Purple with indicator).
  - `QuizQuestionView.tsx`: Accessible choices, clear response, previous/next, and keyboard shortcuts (`[1-5]`, `[A-E]`, `[M]`, `[Arrows]`).
  - `QuizSubmitModal.tsx`: Warning modal summarizing answered vs unanswered questions before final submission.
  - `QuizEngine.tsx`: Fullscreen toggle, window unload prevention, and offline state protection.
- **Verification**: `scripts/verify-phase5.ts` (34/34 passed).

---

### Phase 6: Results, Analytics & Review
- **Diagnostic Performance Engine**:
  - `src/lib/quiz/analytics.ts`:
    - **Cutoff Likelihood & Performance Tiers**: Outstanding ($\ge 85\%$), Competitive ($70-84\%$), Moderate ($50-69\%$), and Needs Focused Revision ($< 50\%$).
    - **Topic Mastery**: Accuracy %, net score, and question volume per syllabus topic.
    - **Difficulty Breakdown**: Easy vs. Medium vs. Hard accuracy metrics.
    - **Time Management & Pacing**: Detects *Fast & Accurate* ($\le 30$s & correct), *Careless Errors* ($\le 30$s & wrong), *Deep Solving* ($> 60$s & correct), and *Time Traps* ($> 60$s & wrong).
- **Results UI Suite**:
  - `ScorecardHero.tsx`: Score summary, accuracy, time taken, and 1-click **"Practice Missed Questions"** CTA button.
  - `AnalyticsCharts.tsx`: Recharts topic accuracy bar chart (color thresholds: Green $\ge 75\%$, Indigo $50-74\%$, Rose $< 50\%$) and 4-quadrant pacing breakdown cards.
  - `QuestionReviewList.tsx`: Filter tabs (`All`, `Incorrect`, `Skipped`, `Correct`, `Marked`, `Saved`), side-by-side answer comparison, solution narratives, diagram lightboxes, in-place bookmark toggling, and question defect reporting.
  - `QuestionReportModal.tsx`: Formal academic defect report submission modal.
- **Verification**: `scripts/verify-phase6.ts` (25/25 passed).

---

### Phase 7: Student Dashboard & Learning Hub
- **Learning Continuity & Recommendation**:
  - `src/services/dashboard.ts`:
    - **"What should I practice today?" Recommendation Engine**: Automatically detects topics with $< 70\%$ accuracy or highest error frequency and prescribes targeted 10-question practice drills with customized rationales.
    - `calculateStreak()`: Timezone-safe consecutive active study streak algorithm.
    - High-level metrics: Total tests taken, questions practiced, overall accuracy %, and total study time.
- **Student Hub Views**:
  - **Student Dashboard** (`/dashboard`): Hero recommendation card, 4 key metric cards, priority improvement areas list, recent attempts summary, and quick access shortcuts.
  - **Saved Questions / Bookmarks Hub** (`/bookmarks`): Catalog of saved questions, statement search, exam filters, expandable solutions, and 1-click **"Practice Saved Questions"** session generator.
  - **My Mistakes Hub** (`/mistakes`): Central error log of all past incorrect and skipped questions, error frequency counters (`timesIncorrect`), and 1-click **"Practice These Mistakes"** remediation session.
  - **Test Attempt History** (`/history`): Chronological log of all mock tests and practice sessions with filter tabs, score pills, accuracy %, and "View Scorecard" / "Resume Test" action buttons.
  - `StudentHeader.tsx`: Responsive navigation bar connecting Dashboard, Mock Tests, Practice, Mistakes, Bookmarks, and History, with mobile drawer support.
- **Verification**: `scripts/verify-phase7.ts` (34/34 passed).

---

### Phase 8: Security, RLS Audit & Mobile Polish
- **PostgreSQL Row-Level Security (RLS) Verification**:
  - Verified RLS policies across all 11 tables.
  - Verified student tenant isolation: students can only view and update their own attempts (`auth.uid() = user_id`), bookmarks, and reports.
  - Verified content gating: students can only access `status = 'published'` content; draft/archived questions and tests are restricted to admins.
  - Storage bucket `quizora-media`: verified 5MB size limit, allowed MIME types (`image/jpeg`, `image/png`, `image/webp`), and admin-only upload/delete policies.
- **Architecture Integrity**: Verified zero anti-patterns (no `question_options` table and no `option_a..e` columns).
- **Mobile Touch Ergonomics**:
  - Verified all buttons and option cards meet accessibility standards ($\ge 44$px touch height).
  - Mobile slide-out drawer for Question Palette in CBT test runner.
  - Recharts visualizations wrapped in `ResponsiveContainer` for fluid scaling on small viewports.
- **Verification**: `scripts/verify-phase8.ts` (29/29 passed).

---

## 🧪 Automated Verification Suites

The repository contains 8 automated verification test suites under `scripts/`. All 166 tests pass with 0 failures:

| Suite | Script | Tests | Description |
|---|---|:---:|---|
| **Phase 1** | `scripts/verify-phase1.ts` | **13 / 13** | Schema rules, Zod schemas, 4/5 option validation, and snapshot structure |
| **Phase 2** | `scripts/verify-phase2.ts` | **12 / 12** | Question CRUD, Option E handling, media filters, and search |
| **Phase 3** | `scripts/verify-phase3.ts` | **12 / 12** | CSV/XLSX normalization, ZIP image extraction, and duplicate detection |
| **Phase 4** | `scripts/verify-phase4.ts` | **7 / 7** | Test builder, sequential question ordering, dual timers, and lifecycle |
| **Phase 5** | `scripts/verify-phase5.ts` | **34 / 34** | Server scoring, negative marks, timer countdown, and snapshot immutability |
| **Phase 6** | `scripts/verify-phase6.ts` | **25 / 25** | Analytics engine, cutoff likelihood, pacing diagnostics, bookmarks, and reports |
| **Phase 7** | `scripts/verify-phase7.ts` | **34 / 34** | Streak algorithm, daily recommendations, mistakes hub, bookmarks, and history |
| **Phase 8** | `scripts/verify-phase8.ts` | **29 / 29** | RLS policy audit, storage constraints, architecture rules, and mobile tokens |
| **TOTAL** | **All 8 Suites Combined** | **166 / 166** | **100% Comprehensive Pass Rate** |

### Run All Verification Tests:
```bash
npx tsx scripts/verify-sql.ts && \
npx tsx scripts/verify-phase1.ts && \
npx tsx scripts/verify-phase2.ts && \
npx tsx scripts/verify-phase3.ts && \
npx tsx scripts/verify-phase4.ts && \
npx tsx scripts/verify-phase5.ts && \
npx tsx scripts/verify-phase6.ts && \
npx tsx scripts/verify-phase7.ts && \
npx tsx scripts/verify-phase8.ts
```

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16.3.4 (App Router, Server Actions, Turbopack) |
| **UI Library & Styling** | React 19, Tailwind CSS, Lucide React Icons |
| **Charts & Visualizations** | Recharts (ResponsiveContainer, BarChart, Tooltip, Cell) |
| **Form & Data Validation** | Zod (QuestionFormSchema, TestFormSchema, AttemptSubmitSchema) |
| **File Processing** | SheetJS (`xlsx`) for spreadsheets, `JSZip` for image archives |
| **Database & Auth** | Supabase (PostgreSQL 15+, Row-Level Security, Supabase Auth) |
| **Media Storage** | Supabase Storage (`quizora-media` bucket) |
| **Type Safety & Quality** | TypeScript (Strict mode, 0 errors), ESLint (0 warnings) |

---

## ⚡ Getting Started & Local Setup

### 1. Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn
- Supabase project or local Supabase CLI (optional: in-memory mock fallback works out of the box)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/kabhinav577/Quizora.git
cd Quizora
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(If Supabase credentials are not provided, Quizora automatically activates its high-performance in-memory persistence fallback for seamless local exploration).*

### 4. Run Database Migrations (if using Supabase)
Apply migrations in order using Supabase SQL Editor or Supabase CLI:
```bash
# 1. Core Schema and Validation Functions
supabase/migrations/20260908000001_initial_schema.sql

# 2. Storage Bucket and Row-Level Security Policies
supabase/migrations/20260908000002_storage_and_rls.sql

# 3. Seed Examination Taxonomy and Sample Questions
supabase/migrations/20260908000003_seed_data.sql
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Code Quality & Build Checks
```bash
# TypeScript strict check (0 errors)
npm run type-check

# ESLint check (0 warnings, 0 errors)
npm run lint

# Production Next.js Turbopack build
npm run build
```

---

## 📄 License
This project is open-source under the MIT License.
