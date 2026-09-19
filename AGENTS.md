# Grovaitech AI Workforce OS — Agent Instructions

## Project Overview

This is **Grovaitech**, a Next.js 15 (App Router) SaaS platform for AI Employees and automation.

- **Framework**: Next.js 15.5 with Turbopack, TypeScript strict mode
- **Database**: Supabase (Postgres + Auth)
- **AI SDK**: `@google/generative-ai` (Gemini) — see `lib/ai/gemini.ts`
- **Tests**: Vitest — run with `npm test`
- **Path alias**: `@/` maps to the repo root

## Critical Conventions

1. **TypeScript strict mode** — no `any` unless already established in that file
2. **Server components vs client components** — check existing files in the same directory for the pattern
3. **No new production dependencies** without explicit approval
4. **Never touch** `lib/supabase/`, `lib/integrations/credentials.ts`, or `supabase/migrations/` without explicit instruction
5. **Never commit secrets** — all sensitive values live in `.env.local` (gitignored)
6. **Never auto-push** — always stop at git commit and wait for human approval

## Path Aliases

```ts
import { X } from '@/lib/ai/gemini'       // lib/ai/gemini.ts
import { Y } from '@/app/actions/leads'   // app/actions/leads.ts
```

## Running Verification

```bash
npm run lint        # ESLint
npm test            # Vitest
npx tsc --noEmit    # TypeScript type check
npm run build       # Next.js build (Turbopack)
```

## Orchestrator Directory

`/orchestrator/` contains the AI Development Orchestrator — a developer tool only, never deployed to Vercel.
Task state lives in `orchestrator/tasks/` which is gitignored.

## What NOT to Touch

- `frontend/` — a separate legacy app, separate package.json
- `.vercel/` — deployment config
- Any file not mentioned in the current task plan
