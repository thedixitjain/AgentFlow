import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side proxy → Render API. Browser calls same-origin `/agentflow-api/*` (no CORS).
 * Set BACKEND_URL on Vercel (e.g. https://agentflow-fg2n.onrender.com — no /api suffix).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function backendBase(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://agentflow-fg2n.onrender.com'
  return raw.replace(/\/$/, '')
}

async function proxy(request: NextRequest, pathSegments: string[] | undefined) {
  const tail = pathSegments?.length ? pathSegments.join('/') : ''
  const search = request.nextUrl.search
  const targetUrl = `${backendBase()}/api/${tail}${search}`

  const headers = new Headers()
  const workspace = request.headers.get('x-workspace-id')
  if (workspace) headers.set('X-Workspace-Id', workspace)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const method = request.method
  const hasBody = !['GET', 'HEAD'].includes(method)

  let res: Response
  try {
    res = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream fetch failed'
    return NextResponse.json(
      { error: `Proxy could not reach backend (${backendBase()}). Set BACKEND_URL on Vercel. ${msg}` },
      { status: 502 }
    )
  }

  const out = new Headers()
  const pass = ['content-type', 'cache-control', 'connection']
  pass.forEach((name) => {
    const v = res.headers.get(name)
    if (v) out.set(name, v)
  })

  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: out,
  })
}

type RouteCtx = { params: Promise<{ path?: string[] }> }

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params
  return proxy(request, path)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
