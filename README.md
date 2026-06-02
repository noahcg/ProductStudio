# Product Studio

A personal founder operating system. One question drives everything: **what should I work on next?**

Product Studio pulls your portfolio of side projects — progress, blockers, infra health, spend, and decisions — into a single dark, premium dashboard so the next action is always obvious.

![Studio](mocks/productstudio.png)

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4** (CSS-first theming via `@theme`)
- **lucide-react** icons, **next-themes** for dark/light
- No chart library — donut, rings, and bars are hand-rolled SVG/CSS

## Screens

| Route | Screen | What it does |
|-------|--------|--------------|
| `/` | **Studio** | Landing dashboard — projects, current focus, signals, recent activity, monthly spend. Matches the approved mockup. |
| `/focus` | **Focus** | The single most important milestone, an interactive task tracker, and a **recommendation engine** that ranks the whole portfolio by momentum, blockers, and urgency. |
| `/roadmaps` | **Roadmaps** | Now / Next / Later planning across every product. |
| `/decisions` | **Decisions** | A running log of decided / open / revisit calls with rationale. |
| `/signals` | **Signals** | Infra health, integrations, activity stream, and open alerts. |
| `/money` | **Money** | Spend tracking — category donut, 6-month trend, line items, and spend-by-project. |

## Architecture

- `src/lib/data.ts` — the single source of truth (mock data, anchored to the mockup's clock). Swapping this for live API calls is the path to a real product.
- `src/lib/recommend.ts` — the transparent scoring heuristic behind "what to work on next." Every recommendation is explainable.
- `src/lib/types.ts` — domain types.
- `src/components/ui.tsx` — design-system primitives (Card, Badge, Progress, Button, etc.).
- `src/components/studio/*` — Studio dashboard sections.
- `src/components/{focus,donut,icons}.tsx` — feature + shared visual components.

## Develop

```bash
npm run dev     # http://localhost:3000
npm run build   # production build (type-checked)
npm run start   # serve the production build
```
