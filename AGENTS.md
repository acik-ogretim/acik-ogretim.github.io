# Açık Öğretim Çalışma Portalı - Agent Instructions

This file serves as the primary instruction manual for AI agents working on this project.

## 🚀 Project Overview
**Açık Öğretim Çalışma Portalı** is a free, open-source, and modern study platform for Open Education Faculty (AÖF) students in Turkey. It provides access to course materials, past exam questions, and interactive quizzes.

**Key Features:**
*   **Static Site Generation (SSG):** Built with Astro v5.
*   **No Database:** Uses static JSON files (`data/`) as the data source.
*   **Interactive Quiz:** Custom `QuizPlayer` class (Vanilla JS/TS) for solving tests.
*   **Accessibility:** Web Speech API integration for TTS (Text-to-Speech).
*   **Offline-First:** Designed to be lightweight and fast.

## 🛠️ Tech Stack & Environment
*   **Framework:** Astro v5.16.6
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4
*   **Data Validation:** Zod
*   **Testing:** Vitest
*   **Package Manager:** npm

## 💻 Dev Environment Tips
*   **Start Dev Server:** `npm run dev` (Runs on `http://localhost:4321`)
*   **Build:** `npm run build` (Outputs to `dist/`)
*   **Test:** `npm test` (Runs Vitest)
*   **Preview:** `npm run preview`

## 🧪 Testing Instructions
*   **Unit Tests:** Located in `src/lib/*.test.ts`. Run `npm test` to execute.
*   **Manual Testing:** Always verify UI changes in mobile view (Responsive Design).
*   **Linting:** Ensure no ESLint errors before committing.

## 📏 Code Style & Standards
*   **Strict Types:** Avoid `any`. Use interfaces/types defined in `src/lib/types.ts`.
*   **SSOT:** `src/lib/schemas.ts` is the Single Source of Truth for data models.
*   **Naming:**
    *   Components: `PascalCase` (`QuizPlayer.astro`)
    *   Functions/Vars: `camelCase` (`calculateScore`)
    *   Files: `kebab-case` for pages (`[course-id].astro`)
*   **Detailed Guide:** See [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) for full rules.

## 📄 Documentation Index
*   [Product Requirements (PRD)](docs/PRD.md)
*   [Technical Architecture (TAD)](docs/TECHNICAL_ARCHITECTURE.md)
*   [Agent Roles](docs/AGENT_ROLES.md)
*   [System Analysis](docs/SYSTEM_ANALYSIS.md)

## 🤖 Agent Behavior Guidelines
*   **Context Awareness:** Always check `docs/` before creating new features.
*   **Proactivity:** If you see a bug or improvement opportunity, fix it (or propose it).
*   **Language:** Communicate in **Turkish** with the user, but write code/comments in **English**.
