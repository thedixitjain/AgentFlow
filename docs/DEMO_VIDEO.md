# Demo video playbook

Use this to record a **short, professional walkthrough** (2-4 minutes) that visitors can watch before trying the app.

## What to publish

1. **Host the video** on YouTube (unlisted or public) or Loom / Vimeo.
2. **Get the embed URL**  
   - YouTube: `https://www.youtube.com/embed/VIDEO_ID`  
   - (Not the watch URL.)
3. **Set in your environment** (e.g. Vercel / `.env.local`):

   ```env
   NEXT_PUBLIC_DEMO_VIDEO_URL=https://www.youtube.com/embed/VIDEO_ID
   ```

4. Redeploy. The landing page **Watch demo** section will show the embedded player.

If the variable is **unset**, the site shows a fallback: animated preview (`/media/demo.gif`) plus a link to this doc.

## Suggested structure (script)

| Time | Shot | Say |
|------|------|-----|
| 0:00-0:20 | Landing hero | “AgentFlow is a multi-agent RAG copilot for business documents: sales, finance, ops.” |
| 0:20-0:45 | Upload or “Try sample data” | “You can upload CSV, Excel, PDF, or text, or start from the built-in sample.” |
| 0:45-1:30 | Ask 2-3 questions | Show grounded answers; mention RAG/sources if visible in the UI. |
| 1:30-2:00 | System Insights (optional) | “The backend exposes telemetry and eval hooks, useful for demos and interviews.” |
| 2:00-2:30 | Architecture one-liner | “Next.js frontend, Express backend, Groq-first LLM, file-backed sessions and vectors.” |
| 2:30-end | CTA | “Repo link in the footer; try it yourself.” |

## Recording tips

- **1080p**, 30fps is enough; clear tab bar / hide unrelated bookmarks.
- Use **one browser window**; full screen or large window.
- **Mic**: quiet room; normalize audio if possible.
- **Cursor**: move deliberately; pause on key UI moments.

## Thumbnail

Use a frame from the chat with a document title visible, or the landing hero with the AgentFlow logo.

## Alternative: GIF

The repo includes `docs/media/demo.gif` (also copied to `public/media/demo.gif` for the site). For silent loops on GitHub/README, the GIF works; for narrative, prefer a narrated video + embed.
