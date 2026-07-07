# Lukupäiväkirja 📖

Henkilökohtainen kirjapäiväkirja — a personal book journal built with React (Vite), TypeScript, Tailwind CSS v4, and an adapter-based data layer that runs against either LocalStorage or Supabase.

## Quick start

```bash
npm install
cp .env.example .env   # defaults to local mode
npm run dev
```

## Data modes

The data layer ([src/services/db.ts](src/services/db.ts)) exposes a single `db` object behind a `DbAdapter` interface. The backend is chosen once at startup from `VITE_DATA_MODE`:

| Mode | Behavior |
|---|---|
| `local` (default) | Reads/writes LocalStorage with ~350 ms mocked latency; self-seeds on first run |
| `supabase` | Real CRUD against the `books` table; seeds the table if it is empty |

### Enabling Supabase mode (with authentication)

1. Create a Supabase project.
2. Paste [supabase/schema.sql](supabase/schema.sql) into the SQL Editor and run it. It creates the `books` table with a `user_id` column and Row Level Security policies so each user can only read/write their own entries.
3. Set in `.env` (and in Netlify → Site settings → Environment variables):
   ```
   VITE_DATA_MODE=supabase
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   The publishable key is Supabase's current name for the public API key; legacy projects can set `VITE_SUPABASE_ANON_KEY` instead — both work.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to your Netlify URL so email-confirmation links redirect back to the deployed app.

In Supabase mode the app shows a login/registration screen (email + password) before the journal. New users get the sample entry seeded into their own journal on first login. Registration sends a confirmation email by default; disable it under Authentication → Sign In / Up → "Confirm email" if you don't want that step. Social logins (Google, GitHub, …) can be added later by enabling a provider in Supabase and calling `supabase.auth.signInWithOAuth` in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx).

Local mode (`VITE_DATA_MODE=local`) skips authentication entirely — it is single-user by nature.

## Deployment (Netlify)

Zero-config: [netlify.toml](netlify.toml) sets the build command (`npm run build`), publish directory (`dist`), and the SPA fallback redirect so deep links like `/kirja/:id` survive refresh. Connect the repo in Netlify and deploy.

## Structure

```
src/
├── App.tsx                    # Routing + data orchestration, loading/error states
├── types.ts                   # Book model (Finnish journal schema)
├── data/seed.ts               # Sample entry (Juurihoito)
├── lib/                       # Supabase client + date formatting
├── services/db.ts             # DbAdapter interface + Local/Supabase adapters
└── components/
    ├── JournalGrid.tsx        # Book card grid
    ├── JournalForm.tsx        # Slide-in create/edit panel
    ├── JournalDetail.tsx      # Full-screen entry view
    ├── DashboardStats.tsx     # Totals, average rating, reading timeline
    ├── WishlistSection.tsx    # Lukulista: books to read, convertible to entries
    ├── RecommendationsPanel.tsx # Safe-field recommendations from other users
    └── StarRating.tsx         # Star display + interactive picker
```

## Wish list & community recommendations

- **Lukulista**: add books you want to read; "Merkitse luetuksi" opens the journal form prefilled and removes the item once the entry is saved.
- **Muut lukijat suosittelevat**: shows *only* the title, author, rating, and recommendation reason of entries other users marked as recommended (never their summaries, quotes, or reflections). Powered by the `recommendations` view in [supabase/schema.sql](supabase/schema.sql); local mode shows demo data. One click adds a recommendation to your own wish list.

## Backup & feedback

The footer has two panels: **Varmuuskopio** exports/imports the whole journal as JSON or CSV, and **Palaute** lets users submit bug reports and feature ideas. Feedback is stored in the write-only `feedback` table — read submissions in the Supabase Table Editor (`select * from feedback order by created_at desc`).
