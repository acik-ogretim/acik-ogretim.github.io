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
*   **Chat Assistant (BYOK):** React islands + TanStack AI; the user's own provider key stays in the browser.
*   **Record Sync:** Opt-in transfer of browser records between devices; the site never receives data.
*   **Discussion & Error Reports:** giscus (GitHub Discussions) and prefilled GitHub issue forms.
*   **Cookieless Visit Counter:** Cloudflare Web Analytics plus an anonymous unique-visitor Worker.

## 🗺️ Where Things Live
*   `src/pages/sohbet.astro`, `src/components/sohbet/` (`Sohbet`, `SohbetCekmece`, `SaglayiciAyarlari`, `SinavKarti`, `BelgeKarti`): chat page, "Derse sor" drawer, provider/key form, mini quiz and document cards.
*   `src/lib/chat/`: `providers.ts` (providers, models, keys), `tools.ts` (chat tools), `gecmis.ts` (history), `enrich.ts` (explanation menu).
*   `src/pages/yedek.astro` + `src/lib/yedek.ts`, `rs-esitle.ts`, `google-esitle.ts`, `p2p-esitle.ts`, `bulut-esitle.ts`: moving records across devices (never export `*-api-key`).
*   `src/lib/viewport.ts` (started from `Layout.astro`): keeps `--app-height`, `--klavye` and `data-keyboard` on `<html>` so bottom panels (search, chat drawer, Tartisma) sit above the on-screen keyboard; the player bar hides while the keyboard is open. `src/lib/eylemler.ts` is the single action registry (id, label, icon, shortcut, run) plus the bar selection stored in `cubuk-duzeni`; `src/lib/cubuk.ts` draws the player bar from it (all widths, trailing buttons drop into the menu when the row is full); `src/components/MobilMenu.tsx` is the headroom top bar (all widths), the menu (bottom sheet on phones, centered dialog from 768 px) and the bar edit mode (@dnd-kit). Shortcuts: M menu, Home top, End bottom, Ctrl+K search. The player bar menu button opens the menu through the `mobil-menu:ac` window event.
*   `src/components/Tartisma.astro`: question/course discussion (giscus) and one-tap error reports.
*   `src/pages/kullanim-kosullari.astro`, `gizlilik.astro`, `rehber.astro`, `hakkimizda.astro`, `iletisim.astro`: legal and help pages. Update `rehber.astro` and `gizlilik.astro` whenever a user-facing feature changes.
*   `workers/sayac/` (`worker.js`, `sema.sql`, `kur.py`): visit counter Worker (Cloudflare + D1).
*   `public/logo.svg`, `public/favicon.svg`: logo and favicon.
*   The settings drawer is in `src/layouts/Layout.astro`; the provider form inside it is `SaglayiciAyarlari.tsx`, which also holds the links to /yedek, the guide, terms and privacy.
*   Search and agent readiness (details, sources and decisions: [docs/yz-ve-ajan-hazirligi.md](docs/yz-ve-ajan-hazirligi.md)):
    *   `src/components/SeoHead.astro` (rendered by `Layout.astro`; pass `description`, `noindex`, `jsonLd`, `markdown` to Layout): canonical, description, Open Graph, Twitter, JSON-LD, `llms.txt` link, and the WebMCP loader. Helpers in `src/lib/seo.ts`.
    *   `src/lib/yapisal-veri.ts`: JSON-LD builders (Organization, WebSite, BreadcrumbList, LearningResource) and the Zod validator. Do not add FAQPage, HowTo, Quiz or top-level Course: Google has no eligible rich result for this Turkish site, and the validator fails on them.
    *   `src/lib/site-haritasi.ts`: indexable catalog (canonical courses with questions) shared by `src/pages/sitemap-index.xml.ts`, `sitemap-sayfalar.xml.ts`, `sitemap-[university].xml.ts` (one sitemap per university), `robots.txt.ts` (`src/lib/robots.ts`), `llms.txt.ts` and `llms-full.txt.ts` (`src/lib/llms.ts`). `@astrojs/sitemap` is not used.
    *   `src/pages/[university]/[department]/[course]/ozet.md.ts` + `src/lib/ders-ozeti.ts`: per-course Markdown summary (units, topics, counts, three sample questions). Never publish a course's full question set in one machine-readable file.
    *   `src/lib/ajan-araclari.ts` (tool definitions, Zod v4 schemas, JSON Schema via `z.toJSONSchema`) + `src/lib/webmcp.ts` (registration on `document.modelContext`, fallback `navigator.modelContext`): experimental WebMCP tools that wrap `eylemler.ts`, `suzgec.ts` and `calisma-durumu.ts`. Loaded only when the browser has a model context. Clearing actions stay closed to agents.
    *   Preview build for checking heads without the full 2 GB build: `ONIZLEME_BOLUMLERI="uni/dept,..." npx astro build --outDir dist-seo`, then `SEO_DIST=dist-seo npx vitest run scripts/tests/seo-dist.test.ts`; delete `dist-seo` afterwards. `public/google0d22887dbe37facb.html` is the Search Console verification file: keep it.

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
*   **E2E (Playwright):** `npm run test:e2e` runs every spec; `npm run test:e2e:calisma` runs the study state scenarios (`tests/e2e/calisma-durumu.spec.ts`: resume position, stored answers, clearing with undo, Sırala, mode switch, shared course back link, backup and mocked Google sync, scroll jump) on a 390x844 phone and a 1280x800 desktop project. The config starts `astro dev` itself or reuses a running one. Another session may own port 4321: use `E2E_PORT=4331 npm run test:e2e:calisma`. When the bundled Chromium of this Playwright version is missing, point `PW_CHROMIUM_PATH` at a local one (here `/opt/pw-browsers/chromium_headless_shell`). Screenshots go to `E2E_EKRAN` (default `$TMPDIR/acik-ogretim-e2e`), traces to `E2E_CIKTI`; open the screenshots and look at them, a green run is not enough. Scenario data: `test-uni/course-senaryo` and `course-senaryo-2`, written by `python3 tests/e2e/fikstur.py`. The dev server reloads when other sessions edit files; rerun a single failure (`-g "5\. "`) before treating it as real.
*   **Study state:** `src/lib/calisma-durumu.ts` (per course `kaldigin-yer`, `cevaplar-<uni>-<ders>`, Zod), `src/lib/soru-siralama.ts` (order, pure), `src/scripts/calisma-baglanti.ts` (player glue). Records use the question's data id, never the card DOM id. Rules: docs/tasarim/mobil-2026-11/DESIGN.md §10.
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
