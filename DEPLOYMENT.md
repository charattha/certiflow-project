# CertiFlow Deployment Guide

**Architecture: Cloudflare Pages (Frontend) + Railway/Render (Backend) + Supabase (Database)**

---

## Prerequisites

- [x] Supabase account — https://supabase.com
- [x] Railway account — https://railway.app (or Render: https://render.com)
- [x] Cloudflare account — https://dash.cloudflare.com
- [x] Git repository (GitHub / GitLab)

---

## Step 1 — Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, password, and region closest to your users
3. Once created, go to **Project Settings → Database**
4. Get the two connection strings under **Connection string**:
   - **Session mode (port 5432)** → this is your `DIRECT_URL` (for migrations)
   - **Transaction mode (port 6543)** → this is your `DATABASE_URL` (for runtime)

> [!IMPORTANT]
> The Transaction mode URL must have `?pgbouncer=true` appended.

5. Run Prisma migrations against Supabase:
   ```bash
   cd backend
   # Create a .env file with both connection strings
   npx prisma migrate deploy
   npx prisma db seed   # Optional: seed initial super admin
   ```

---

## Step 2 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select your repository and set **Root Directory** to `backend`
3. Railway will auto-detect the `Procfile` and run: `npm run build && npm start`
4. Set the following **Environment Variables** in Railway:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase Transaction mode URL (port 6543) |
   | `DIRECT_URL` | Supabase Session mode URL (port 5432) |
   | `JWT_SECRET` | Run `openssl rand -base64 64` to generate |
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | Your Cloudflare Pages URL (set after Step 3) |
   | `PORT` | Leave empty — Railway sets this automatically |

5. Once deployed, note your Railway backend URL (e.g., `https://certiflow-backend.railway.app`)
6. Go back to Railway and set `FRONTEND_URL` to your Cloudflare Pages URL

> [!TIP]
> You can set `FRONTEND_URL` to multiple URLs (comma-separated) to allow both production and preview Pages URLs:
> `https://certiflow.pages.dev,https://my-custom-domain.com`

---

## Step 3 — Deploy Frontend to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages → Create a project → Connect to Git**
2. Select your repository
3. Set **Build settings**:
   - **Root directory (project root)**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add **Environment Variables** (Production):

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | Your Railway backend URL (from Step 2) |

5. Click **Save and Deploy**

> [!NOTE]
> The `public/_redirects` file is already in place to handle React SPA routing. All routes will correctly serve `index.html`.

---

## Step 4 — Verify CORS is Correct

After both are deployed:
1. Go to your Cloudflare Pages URL (e.g., `https://certiflow.pages.dev`)
2. Try to log in
3. If you get a CORS error, make sure `FRONTEND_URL` in Railway exactly matches your Pages URL (no trailing slash)

---

## Updating FRONTEND_URL in Railway (After Pages Deploy)

Once you have your Pages URL:
1. Railway → Your project → **Variables**
2. Update `FRONTEND_URL` to your actual Pages domain
3. Railway will automatically redeploy

---

## Local Development (No Changes)

Local development works exactly as before:
```bash
# Terminal 1 — Backend
cd backend
npm run dev   # Uses .env (localhost Postgres)

# Terminal 2 — Frontend
cd frontend
npm run dev   # Vite proxy forwards /api → localhost:3001
```

No `VITE_API_URL` needed locally — the Vite dev proxy handles it.

---

## Environment Variable Summary

### Backend (Railway)
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection (port 6543) |
| `DIRECT_URL` | Supabase direct connection (port 5432) — migrations |
| `JWT_SECRET` | Strong random secret (min 32 chars) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Cloudflare Pages URL(s), comma-separated |

### Frontend (Cloudflare Pages)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Railway backend URL (no trailing slash) |
