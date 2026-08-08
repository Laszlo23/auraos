# Aura OS — AI Company Operating System

A living operating system for an autonomous AI company. Dark-first, glass surfaces, aurora light, huge whitespace, two accent colors. Not a dashboard — a company that runs itself.

## Visual language (built first, everything inherits it)

- Deep charcoal canvas with a slow-drifting aurora field behind glass panels
- Two accents only: a cool electric cyan (intelligence/activity) and a warm amber (revenue/opportunity)
- Frosted floating panels, no harsh borders, generous premium shadows, large rounded corners
- Display typography for headline numbers, tight quiet type for labels
- Motion system: spring transitions, animated counters, streaming text, shimmer skeletons, breathing "agent thinking" pulses, page transitions
- Light mode included but dark is the default

## Navigation

Collapsible glass sidebar with workspace switcher (AI Companies), grouped sections, and live status dots on Agents/Tasks. Command palette (Cmd+K) with global search over agents, tasks, products, files, and knowledge. On mobile: bottom navigation, swipe between primary views, and a floating AI assistant button that opens the CEO in a sheet.

## Pages

Every route listed gets a real, full page — not placeholders.

- **Home** — 8 KPI cards (Revenue, Activity, Visitors, AI Tasks, Conversion, Growth, Credits, Runway) with animated counters and sparklines; below: live AI timeline, recent agent actions, suggested improvements, CEO thoughts, upcoming opportunities.
- **CEO** — full-height conversational surface, closer to a chat product than a dashboard: streaming responses from a real AI model, suggested prompts, quick actions, file upload, voice input, and a right rail with CEO status, memory, long-term strategy, and current objectives.
- **Agents** — grid of agent cards (avatar, role, current task, health, activity, revenue generated, performance, memory, credits) with Pause / Duplicate / Train / Upgrade; detail page with activity timeline and metrics.
- **Tasks** — Kanban / Timeline / Calendar views, status lanes (queue, running, completed, failed), priority, expected ROI, dependencies, agent assignment, AI recommendations.
- **Products** — large product cards with revenue, conversion, subscriptions, inventory, plus AI actions (description, pricing, creatives, landing page).
- **Customers** — elegant list + customer detail with lifetime value, activity, and AI notes.
- **Website** — live preview frame, SEO / performance / accessibility scores, deploy button, version history, AI recommendations.
- **Analytics** — animated charts, realtime visitors, funnels, country map, traffic sources, revenue prediction, AI insights.
- **Marketing / Sales** — campaign and pipeline surfaces with agent-driven suggestions.
- **Automation** — visual node editor with animated curved connections plus a natural-language "describe the workflow" input.
- **Knowledge** — second brain with a visual knowledge graph and ask-a-question search.
- **Files** — Finder-like browser, drag & drop, AI categorization, semantic search, auto summaries.
- **Marketplace** — installable AI employees (Marketing, SEO, Developer, Designer, Sales, Finance, Lawyer, Support) with one-click install.
- **Billing** — credits, usage, plans.
- **Settings** — Apple-minimal, searchable.

## Backend (Lovable Cloud)

Auth (email/password + Google), then tables scoped by RLS to the owner: companies, agents, tasks, products, customers, files, knowledge items, activity events, metrics snapshots, conversations and messages, marketplace installs, automations. Seeded with a rich demo company so the app is alive on first open. A lightweight simulation tick advances agent activity and metrics so the timeline and counters keep moving.

## CEO AI

Real streaming AI over the Lovable AI gateway with a CEO persona grounded in the company's agents, tasks, products, and metrics. Conversations persist per company.

## Build order

1. Design system, app shell, sidebar, command palette, motion primitives
2. Lovable Cloud: auth, schema, RLS, demo seed
3. Home, CEO (real AI), Agents, Tasks
4. Products, Customers, Website, Analytics, Marketing, Sales
5. Automation, Knowledge, Files, Marketplace, Billing, Settings
6. Mobile experience, micro-interactions, confetti on first sale, polish pass

## Technical notes

TanStack Start with file-based routes, TanStack Query for reads via route loaders, Motion for animation, Recharts for charts. Supabase access through `createServerFn`; the CEO stream via a `/api/chat` server route using the AI SDK against the Lovable AI gateway. Per-route head metadata. Design tokens live in `src/styles.css` — no hardcoded colors in components.
