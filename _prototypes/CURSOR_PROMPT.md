# Cursor / Claude Code prompt — Vendoors

Paste this as the first message when starting a Cursor / Claude Code session. The agent will read `SPEC.md` and the HTML prototypes and scaffold the real site.

---

You are building **Vendoors**, a Yupoo-style photo gallery marketplace, in this empty repo. The full spec is in `SPEC.md`. The visual + interaction source of truth is the HTML prototypes: `Home.html`, `Vendoors.html`, `Locked Album.html`, `styles.css`, `data.jsx`, `home.jsx`, `album.jsx`, `landing.jsx`, `locked.jsx`.

**Read these files first**, then build in the order under "Build order" in `SPEC.md`. Stop after each numbered step and ask me to verify before moving on.

Hard rules:
1. **Match the prototypes pixel-for-pixel.** The CSS variables, type scale, spacing, and component structure in `styles.css` are the design system. Carry them into `globals.css` as-is. Do not redesign.
2. **TypeScript everywhere.** No `any`. Use Supabase generated types (`supabase gen types typescript`).
3. **Server Components by default.** Use Client Components only where interactivity demands it (lightbox, upload, forms with state).
4. **No mock data in production code.** Replace the prototype's `ALBUMS` array with Supabase queries. Keep the seed script for local dev.
5. **Row Level Security on every table.** No exceptions. The policies are in `SPEC.md`.
6. **Don't skip moderation, rate limits, or DMCA.** Build them with the feature, not after.

Start with step 1: scaffold the Next.js project, wire Tailwind, set up Supabase client (server + browser + middleware), and verify a `vercel dev` deploy works locally. Then push to GitHub and confirm the Vercel preview URL renders the default page.

After step 1 is verified, ask for: my Supabase project URL + anon key + service role key, my Cloudflare account ID + R2 credentials, my Resend API key, my Stripe test keys, my Turnstile keys. Don't proceed without them.
