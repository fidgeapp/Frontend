# Deploying Fidge Frontend on Railway

## What changed in your project

Two files are **replaced/added** inside your `Frontend/` folder:

| File | What changed |
|---|---|
| `next.config.ts` | Added `output: 'standalone'` — required for the Docker image |
| `Dockerfile` | New file — multi-stage build that produces a lean production image |
| `railway.toml` | New file — tells Railway how to build & run the service |

---

## Step-by-step deployment

### 1. Copy the 3 files into your Frontend folder

Drop `Dockerfile`, `next.config.ts`, and `railway.toml` into the root of your
`Frontend/` directory (same level as `package.json`).

### 2. Open your Railway project

Go to [railway.app](https://railway.app) → open your existing project (where your
backend + database already live).

### 3. Add a new service

- Click **"+ New"** → **"GitHub Repo"** (or "Empty Service" if you want to link
  manually).
- Select your repo and set the **root directory** to `Frontend` (Railway calls
  this "Source Directory" in the service settings).

> If your frontend is in a separate repo, just point Railway at that repo instead.

### 4. Set the Build Variables (⚠️ important for Next.js)

`NEXT_PUBLIC_*` variables are **baked in at build time**, not read at runtime.
In Railway, go to your frontend service → **Variables** tab → switch the toggle
to **"Available at build time"** for each one:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api` |
| `NEXT_PUBLIC_ETH_WALLET` | Your Ethereum wallet address |
| `NEXT_PUBLIC_AD_PROVIDER` | `adsterra` (or `adsense` / `both`) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Your AdSense client ID |
| `NEXT_PUBLIC_ADSENSE_SLOT` | Your AdSense slot ID |
| `NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR` | Your Adsterra social bar script URL |
| `NEXT_PUBLIC_ADSTERRA_POPUNDER` | Your Adsterra popunder script URL |

Railway also injects `PORT` automatically at runtime — the Dockerfile is already
set up to use it.

### 5. Deploy

Click **"Deploy"**. Railway will:
1. Detect the `Dockerfile` and run the multi-stage build.
2. Start the Next.js standalone server on the injected `PORT`.
3. Give your frontend a `*.up.railway.app` domain.

### 6. Set a custom domain (optional)

Service settings → **Networking** → **Add Custom Domain** → point your DNS
`CNAME` to Railway's provided value.

---

## Why `output: standalone`?

Next.js's standalone mode bundles only the files actually needed to run the app
(no `node_modules` shipped wholesale). The Dockerfile's Stage 3 copies just
three things:

```
.next/standalone/   ← the server + its minimal deps
.next/static/       ← hashed JS/CSS chunks
public/             ← your static assets
```

This keeps the final Docker image small (typically ~150–250 MB vs 1 GB+).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails: `Cannot find module '...'` | Run `npm install` locally, commit `package-lock.json`, redeploy |
| App loads but API calls fail (CORS / 404) | Double-check `NEXT_PUBLIC_API_URL` has no trailing slash and is set as a **build** variable |
| Blank page / hydration error | Check browser console; usually a mismatch between build-time env and actual backend URL |
| `PORT` binding error | Don't hardcode port in your code — Railway sets `PORT` dynamically; the Dockerfile already handles this |
