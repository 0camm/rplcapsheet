# RPL Capsheet

A simple, shared salary capsheet with a password-protected admin panel.

- **Public view**: anyone with the link can see the capsheet, read-only.
- **Admin panel**: unlocks editing after logging in with a password that lives
  only in a Vercel environment variable. The password is never sent to the
  browser, never stored in localStorage, and never appears in any API
  response — only a signed, HttpOnly session cookie is issued after a
  successful login.
- **Data storage**: a small Upstash Redis database, so edits are saved
  instantly and are visible to everyone, on any device.

## 1. Push this folder to GitHub

Create a new repo and push these files (`index.html`, `api/`, `package.json`, etc).

## 2. Create a free Upstash Redis database

- Go to https://upstash.com (or use the Upstash integration from the Vercel
  Marketplace when importing your project — this sets the env vars for you
  automatically).
- Create a Redis database.
- From the database's **REST API** tab, copy the `UPSTASH_REDIS_REST_URL`
  and `UPSTASH_REDIS_REST_TOKEN` values.

## 3. Import the project into Vercel

- vercel.com → **Add New Project** → import your repo.
- Before (or right after) the first deploy, open **Project Settings →
  Environment Variables** and add:

  | Name | Value |
  |---|---|
  | `ADMIN_PASSWORD` | the password you'll type into the Admin Panel |
  | `SESSION_SECRET` | a long random string (recommended, but optional — falls back to `ADMIN_PASSWORD` if omitted) |
  | `UPSTASH_REDIS_REST_URL` | from Upstash |
  | `UPSTASH_REDIS_REST_TOKEN` | from Upstash |

  (See `.env.example` for the same list.)

- Deploy.

## 4. Use it

- Open the site — the capsheet loads for everyone, read-only.
- Click **Admin Panel**, enter `ADMIN_PASSWORD`, and you'll get full editing:
  inline player rename/delete, add players, move players between tiers, add
  or delete tiers. Every change auto-saves to Redis immediately.
- **Log Out** in the admin panel clears your session; anyone without the
  password only ever sees the read-only view.

## Changing the password later

Just update `ADMIN_PASSWORD` in Vercel's Environment Variables and redeploy
(or it takes effect on the next deploy / function cold start). Existing
logged-in sessions stay valid until they expire (8 hours) or you log out.

## Local development

```
npm install
vercel dev
```

You'll need a `.env` file locally (copy `.env.example`) with real values —
`vercel dev` reads it automatically. Don't commit `.env`.
