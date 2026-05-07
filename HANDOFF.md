# Vendoors — handoff / new device setup

A Yupoo-style vendor gallery platform. Vendors create albums of product photos, share contact info, and buyers send inquiry carts via shareable links.

## Live URLs
- Production: https://vendoors.vercel.app
- Repo: https://github.com/qmako4/vendoors
- Vercel project: `qmako4s-projects/vendoors`
- Supabase project ref: `wlzqidculiejnfttjrfu`

## Stack
- Next.js 16 (App Router, TypeScript)
- Supabase (Postgres + auth + storage)
- Vercel (hosting + auto-deploy from GitHub)
- Tailwind CSS 4 (very lightly used; mostly hand-written CSS in `app/globals.css`)

## Setup on a new device (10 min)

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Clone and install
git clone https://github.com/qmako4/vendoors.git
cd vendoors
npm install

# Pull env vars from Vercel (Supabase keys + site URL)
npx vercel login         # opens browser, sign in as qmako4
npx vercel link          # pick existing project: vendoors
npx vercel env pull .env.local

# Start Claude Code
claude
```

When Claude Code starts, paste this once so it picks up context:
> Read AGENTS.md, SPEC.md, the supabase/migrations/ folder, and this HANDOFF.md to get up to speed.

## Project layout

```
app/
  (marketing)/        # Home page
  [handle]/           # Public vendor gallery + product pages
  cart/               # Shareable inquiry cart
  dashboard/          # Vendor admin (auth-gated)
    albums/           # Product CRUD
    categories/       # Category CRUD
    galleries/        # Multi-gallery management
    media/            # Image library + bg removal
    profile/          # Vendor profile editor
components/           # Shared components
lib/                  # Server + client helpers
  supabase/           # Auth + DB clients
  active-gallery.ts   # Multi-gallery cookie helper
  storage.ts          # Image resize + thumb URL helpers
  bg-remove.ts        # Client-side background removal
  cart.ts             # localStorage cart store
supabase/migrations/  # SQL migrations (numbered, run in order)
```

## Workflow

- **Make changes** in code → `git push` → Vercel deploys in ~30s
- **Schema changes**: add a migration file in `supabase/migrations/` AND run the SQL in the Supabase dashboard (https://supabase.com/dashboard/project/wlzqidculiejnfttjrfu/sql/new)
- **Content changes** (products, photos): use the dashboard at /dashboard

## Quick edits without Claude Code
Open https://github.com/qmako4/vendoors and press `.` (period) to launch VS Code in the browser. Edit, commit, push. Works from any device including phones.

## Known gotchas
- Vercel image optimization is **disabled** (`unoptimized: true` in next.config.ts) because hobby tier ran out of quota. Images load directly from Supabase. Each upload generates both a full-size (1600px) and a thumb (480px) — grids use the thumb.
- Multi-gallery: each user can own multiple `profiles` rows. Active gallery is cookie-driven (`active_gallery`). Switch via the top-right dropdown.
- BG remover (client-side, free): downloads a ~30MB ML model on first run, then cached.

## If Claude Code on the laptop has no memory of past work
Tell it:
> I'm continuing work on this project from a different machine. Read the codebase starting with AGENTS.md, SPEC.md, the latest migrations in supabase/migrations/, and HANDOFF.md. Then summarize the current state and ask what I want to work on.
