# Project: Açık Öğretim Çalışma Portalı

## 🧠 Context & Instructions

This project is a high-performance, static educational platform. As an AI agent, you must adhere to the following context and guidelines.

### 📂 Core Documentation
@AGENTS.md
@docs/PROJECT_STANDARDS.md
@docs/TECHNICAL_ARCHITECTURE.md

### 🎭 Agent Roles
Refer to [AGENT_ROLES.md](docs/AGENT_ROLES.md) to understand which persona you should adopt for specific tasks (e.g., "Senior Frontend Developer" or "System Architect").

### 🚨 Critical Constraints
1.  **No Database:** All data is in JSON files. Do not suggest SQL/NoSQL solutions unless explicitly asked for a major refactor.
2.  **Client-Side Logic:** State management relies on `localStorage` and Vanilla JS/React islands.
3.  **Privacy:** Never send user data to a server.
4.  **Language:** User interaction -> Turkish. Code/Docs -> English.

### 📝 Task Specific Context
@docs/USE_CASES.md
@docs/SRS.md
