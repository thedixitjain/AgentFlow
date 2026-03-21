# Custom domain: `agentflow.thedixitjain.com`

Use this when the Next.js app is on **Vercel** and the API is on **Render** (or another host).

## 1. Vercel — connect the subdomain

1. Open your **AgentFlow** project on [Vercel](https://vercel.com) → **Settings** → **Domains**.
2. Click **Add** and enter: `agentflow.thedixitjain.com`.
3. Vercel will show DNS records to add. Usually:
   - **Type:** `CNAME`
   - **Name:** `agentflow` (or `@` if using apex — subdomains almost always use `agentflow`)
   - **Value:** `cname.vercel-dns.com` (or whatever Vercel displays — use their exact value).

## 2. DNS — at your domain registrar

Where **thedixitjain.com** is managed (Cloudflare, Namecheap, Google Domains, etc.):

1. Add the **CNAME** record Vercel gave you for `agentflow`.
2. Wait for propagation (often a few minutes; can be up to 48h).

Confirm in Vercel that the domain shows **Valid**.

## 3. Vercel — environment variables

In **Settings** → **Environment variables** (Production):

| Name | Example value |
|------|----------------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND.onrender.com/api` |

Use your real Render (or API) URL, **HTTPS**, and include `/api` at the end.

Redeploy the frontend after saving.

## 4. Render (backend) — CORS

In your **API** service → **Environment**, set:

```env
CORS_ORIGIN=https://agentflow.thedixitjain.com,http://localhost:3000
```

- Production origin must match the browser origin **exactly** (`https`, no trailing slash).
- Keep `http://localhost:3000` if you still test locally against production API.

Redeploy the backend after saving.

## 5. Check

1. Open `https://agentflow.thedixitjain.com`.
2. Open browser **DevTools** → **Network** → send a chat or load sessions.
3. API calls should return **200**, not CORS errors.

If you see CORS errors, double-check `CORS_ORIGIN` on Render and that `NEXT_PUBLIC_API_URL` points to the same API you deployed.
