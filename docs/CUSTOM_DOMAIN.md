# Custom domain: `agentflow.thedixitjain.com`

The Next.js app is on **Vercel** and the API is on **Render**.

## Recommended: same-origin API proxy (no CORS pain)

The repo proxies `/agentflow-api/*` → your Render `/api/*` via `next.config.js`. The **browser only talks to your Vercel domain**, so you do **not** rely on cross-origin requests to Render (which often fail until CORS is perfect).

### Vercel: environment variables (Production)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `/agentflow-api` |
| `BACKEND_URL` | `https://YOUR-SERVICE.onrender.com` (no `/api` suffix) |

If you omit `BACKEND_URL`, the project defaults to the Render URL used in `next.config.js`; override it for your own fork.

**Redeploy** after saving (required for `NEXT_PUBLIC_*`).

### Render: CORS (optional when using proxy)

With the proxy, browsers do not call Render directly, so CORS is less critical. You can still set:

```env
CORS_ORIGIN=https://agentflow.thedixitjain.com,http://localhost:3000
```

for direct API access (e.g. `curl`, mobile apps).

---

## Alternative: direct API URL (requires correct CORS)

Point the browser straight at Render:

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-SERVICE.onrender.com/api` |

Then **Render must** allow your Vercel origin in `CORS_ORIGIN` (exact URL, `https`, no trailing slash).

---

## 1. Vercel: connect the subdomain

1. Project → **Settings** → **Domains** → add `agentflow.thedixitjain.com`.
2. Add the **CNAME** at your DNS host that Vercel shows.

## 2. Check

1. Open `https://agentflow.thedixitjain.com`.
2. **Try sample data** should work without a red error banner.
3. DevTools → **Network**: requests should go to `agentflow.thedixitjain.com/agentflow-api/...`, not to `onrender.com` from the browser.
