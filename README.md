# WMC Anforderungsportal

A modern, AI-powered requirements collection platform built by **WMC — Wamocon Consulting**.

## Overview

The Anforderungsportal helps businesses collect, organise, and review project requirements through structured digital forms, voice input, and AI-driven text improvement. It replaces chaotic email exchanges with a guided, multi-language workflow.

## Key Features

- **Smart Forms** — Template-based requirement forms with sections and various question types
- **Voice Input** — Speech-to-text with real-time transcription via Web Speech API
- **AI Polish** — Google Gemini-powered text refinement for professional requirement documents
- **AI Interviewer** — Conversational chat mode for guided requirement collection
- **25 Languages** — Full internationalisation with `next-intl` (default: German)
- **Role-Based Access** — Super Admin, Staff, and Product Owner roles with row-level security
- **Dark/Light Mode** — Theme toggle with automatic preference persistence
- **GDPR Compliant** — EU-hosted data, encrypted transport, no training on user data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 19 |
| Database | Supabase (PostgreSQL) with RLS |
| AI | Google Gemini via Vercel AI SDK |
| Styling | Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| i18n | next-intl (25 locales) |
| Testing | Playwright (E2E) |
| Deployment | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables (copy and fill in secrets)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (admin)/      # Admin dashboard, projects, templates, responses
│   │   ├── (auth)/       # Login, magic link, password reset
│   │   ├── (client)/     # Client form (fill + interview modes)
│   │   ├── (portal)/     # My Projects, Account
│   │   └── landing/      # Marketing landing page
│   └── api/              # AI endpoints, form logic, auth callbacks
├── components/           # Reusable UI + voice recorder
├── i18n/                 # Routing and locale configuration
└── lib/                  # Utilities, Supabase client, rate limiting
messages/                 # Translation JSON files (25 languages)
supabase/migrations/      # Database schema migrations
e2e/                      # Playwright end-to-end tests
scripts/                  # Translation sync and E2E setup utilities
docs/                     # User manuals (EN + DE)
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx playwright test` | Run E2E tests |

## Documentation

User manuals are available in the `docs/` directory:
- `WMC_Anforderungsportal_User_Manual_EN.docx` — English
- `WMC_Anforderungsportal_Benutzerhandbuch_DE.docx` — German

## License

Proprietary — WMC Wamocon Consulting. All rights reserved.
