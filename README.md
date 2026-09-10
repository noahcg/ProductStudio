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
| `/projects` | **Projects** | Project workspaces — current tasks, goals, project notes, and operational context. `/focus` redirects here for compatibility. |
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

## Desktop app (personal Mac)

Product Studio can also run as a dedicated desktop app. It starts the same Next.js
server locally, so server actions, route handlers, and integrations continue to work.
The macOS app icon and menu-bar icon are generated from `public/images/app-icon.png`
each time the packaged app is built.

```bash
npm run desktop:dev      # Electron window + local development server
npm run desktop:package  # builds a local macOS .app in release/mac-arm64/
```

The packaged app reads credentials from
`~/Library/Application Support/Product Studio/.env.local`. Copy the variables you
need from `.env.local` into that file before opening the packaged app. Credentials
are deliberately excluded from the application bundle.

Its persistent local data lives at
`~/Library/Application Support/Product Studio/data.json`. For an existing web
workspace, migrate its data once before using the packaged app:

```bash
npm run desktop:migrate-data
```

The desktop shell includes a menu-bar item and global open shortcut:
`Cmd+Shift+Space` (or `Ctrl+Shift+Space` on Windows). Closing its window keeps it
available in the menu bar; use **Quit** from that menu to stop it.
