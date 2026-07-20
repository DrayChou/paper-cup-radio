/// <reference lib="dom" />
/// <reference path="./deno-desktop.d.ts" />

import { dirname, join } from '@std/path'
import embeddedServerJs from '../dist/server.js' with { type: 'text' }
import embeddedDesktopHtml from '../public/desktop.html' with { type: 'text' }
import embeddedDesktopJs from '../public/desktop.js' with { type: 'text' }
import embeddedFaviconSvg from '../public/favicon.svg' with { type: 'text' }
import embeddedMobileHtml from '../public/mobile.html' with { type: 'text' }
import embeddedMobileJs from '../public/mobile.js' with { type: 'text' }
import embeddedStylesCss from '../public/styles.css' with { type: 'text' }

const SERVER_PORT = 8765
const HOST_BOOT_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paper Cup Radio</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f1115;
        color: #f4f7fb;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card {
        padding: 20px 24px;
        border-radius: 16px;
        border: 1px solid #2c3342;
        background: #171a21;
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.25);
      }
      p { margin: 8px 0 0; color: #9da6b5; }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>Paper Cup Radio 正在启动…</strong>
      <p>总台会在本地服务就绪后自动打开。</p>
    </div>
  </body>
</html>`

function backendUrl(pathnameWithQuery: string) {
  return `${serverBase}${pathnameWithQuery}`
}

const APP_NAME = 'Paper Cup Radio'

const DESKTOP_CLIENT = {
  clientId: 'desktop-host',
  deviceName: 'Paper Cup Radio Host',
  role: 'desktop',
} as const

const serverBase = `http://127.0.0.1:${SERVER_PORT}`
const trayIconBytes = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAAAAAAAAPlDu38AAAAHdElNRQfqBwYGJTbPhChEAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA3LTA2VDA2OjM3OjU0KzAwOjAwALZWDwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wNy0wNlQwNjozNzo1NCswMDowMHHr7rMAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDctMDZUMDY6Mzc6NTQrMDA6MDAm/s9sAAACK0lEQVRYw+3Wu2sUURgF8N+4uyZZokRBg5r4qoJgIeKjsLSxtLDSTv0vLG3SCnaivaggRBCx0EYFRVERxDeaGDXxsUk05DE7FjviZvbuxCxauQcuzD333G/OfPfe7w5ttPG/I8obfHryWAM3cOLMXzWw7A80RaxF6V9koJg3mMTzVKvFqFjqEUWTmFtK8CSeWdCPCh1Lmxz/+CaerpRGh84VkyRRnZuWxDMNgevn5LUQojwDKQ7iAC7gDiayXxQIXkIvBrATV/EwlIHcJUixC8dxGPdxCecxktF1YQ/2Yje2ow/zuNEs+GIGlmFz+lzGvrRVcDaj3YGLWJ3hXwbMLnhBHsrYmOHmMParU5f+jegJxBjGl1YN9GBdhvuB0YB2Q5N4r9I5LRno1ZjSCsYD2v4mMZ7lvSBooC6tfejODH9OTdSjkGqziPFiyQbqsEXjRv2A7xmuS+NSwSRe07wILWZga4AbwWyGW4k1Ae248H75IwMlv49gPd4FuNVY1UT7tVUDK7ApwA8HuF6Ne4XaCZhu1UAB7y1M94y0qESFjvrNuh6hRX5uEeRVwjEcUat8h7Afy/ExoO33+16J8QlPcBOSpNqSAWpH7jKGsE2tzoeWoBv3cAu3RdGDR5dOT7y9e22q2FlWnW9+iwcNBG65GI/T1iDHKQxK68PsVMWb21fKxc5yUp2bJWr+45Wbgfqz2+w+R6JWG2qdauz64FHFznKt/Ea5f31ttNGGn0dysoLd9X6TAAAAAElFTkSuQmCC'),
  (char) => char.charCodeAt(0),
)

let hubWindow: Deno.BrowserWindow | null = null
let tray: Deno.Tray | null = null
let serverProcess: Deno.ChildProcess | null = null
let mobileUrl = `${serverBase}/`
let lastHistoryId: string | null = null
let runtimeRoot = ''
let serverEntry = ''
const EMBEDDED_RUNTIME_FILES = [
  ['dist/server.js', embeddedServerJs],
  ['public/desktop.html', embeddedDesktopHtml],
  ['public/desktop.js', embeddedDesktopJs],
  ['public/favicon.svg', embeddedFaviconSvg],
  ['public/mobile.html', embeddedMobileHtml],
  ['public/mobile.js', embeddedMobileJs],
  ['public/styles.css', embeddedStylesCss],
] as const
const internalServeAddress = Deno.env.get('DENO_SERVE_ADDRESS') ?? 'tcp:127.0.0.1:0'
const internalServePort = internalServeAddress.split(':').pop() ?? '0'
const internalServeBase = `http://127.0.0.1:${internalServePort}`

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (url.pathname === '/') {
    return new Response(HOST_BOOT_HTML, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  if (url.pathname === '/ws') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const upstream = new WebSocket(backendUrl('/ws'))

    socket.addEventListener('message', (event) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(event.data)
      }
    })
    socket.addEventListener('close', () => {
      upstream.close()
    })
    socket.addEventListener('error', () => {
      upstream.close()
    })

    upstream.addEventListener('message', (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data)
      }
    })
    upstream.addEventListener('close', () => {
      socket.close()
    })
    upstream.addEventListener('error', () => {
      socket.close()
    })

    return response
  }

  const target = backendUrl(`${url.pathname}${url.search}`)
  const proxyInit: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: req.headers,
    body: req.body,
  }
  if (req.body) {
    proxyInit.duplex = 'half'
  }

  const proxied = await fetch(target, proxyInit)

  return new Response(proxied.body, {
    status: proxied.status,
    headers: proxied.headers,
  })
})

async function fileExists(filePath: string) {
  try {
    await Deno.stat(filePath)
    return true
  } catch {
    return false
  }
}

function resolveRuntimeRoot() {
  const candidates = [
    Deno.env.get('PAPER_CUP_RADIO_RUNTIME_ROOT'),
    Deno.env.get('LOCALAPPDATA') ? join(Deno.env.get('LOCALAPPDATA')!, 'PaperCupRadio') : undefined,
    Deno.env.get('APPDATA') ? join(Deno.env.get('APPDATA')!, 'PaperCupRadio') : undefined,
    Deno.env.get('TEMP') ? join(Deno.env.get('TEMP')!, 'PaperCupRadio') : undefined,
    join(Deno.cwd(), '.paper-cup-radio-runtime'),
  ].filter((value): value is string => Boolean(value))

  return candidates[0]
}

async function writeRuntimeTextFile(filePath: string, content: string) {
  try {
    const existing = await Deno.readTextFile(filePath)
    if (existing === content) {
      return
    }
  } catch {
    // write below
  }

  await Deno.mkdir(dirname(filePath), { recursive: true })
  await Deno.writeTextFile(filePath, content)
}

async function ensureRuntimeBundle() {
  if (!runtimeRoot) {
    runtimeRoot = resolveRuntimeRoot()
    console.log(`[host] runtime root: ${runtimeRoot}`)
  }

  for (const [relativePath, content] of EMBEDDED_RUNTIME_FILES) {
    await writeRuntimeTextFile(join(runtimeRoot, relativePath), content)
  }

  serverEntry = join(runtimeRoot, 'dist', 'server.js')
}

async function resolveNodeCommand() {
  const envOverride = Deno.env.get('REMOTE_INPUT_NODE')
  if (envOverride && await fileExists(envOverride)) {
    return envOverride
  }

  const pathEntries = (Deno.env.get('PATH') || '').split(Deno.build.os === 'windows' ? ';' : ':').filter(Boolean)
  const pathCandidates = pathEntries.map((entry) => join(entry, Deno.build.os === 'windows' ? 'node.exe' : 'node'))
  const platformCandidates = Deno.build.os === 'windows'
    ? [
        'C:/Program Files/nodejs/node.exe',
        'C:/Program Files (x86)/nodejs/node.exe',
      ]
    : [
        '/opt/homebrew/bin/node',
        '/usr/local/bin/node',
        '/usr/bin/node',
      ]

  for (const candidate of [...pathCandidates, ...platformCandidates]) {
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  throw new Error('Node.js runtime not found. Install Node.js or set REMOTE_INPUT_NODE to an absolute node path.')
}

function logStream(prefix: string, stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return
  ;(async () => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true }).trim()
      if (text) {
        console.log(`[${prefix}] ${text}`)
      }
    }
  })().catch((error) => console.error(`[${prefix}]`, error))
}

async function startServer() {
  if (serverProcess) return

  console.log('[host] startServer begin')

  try {
    const response = await fetch(`${serverBase}/api/info`)
    if (response.ok) {
      const info = await response.json() as { mobileUrls?: string[] }
      mobileUrl = info.mobileUrls?.[0] || `${serverBase}/`
      console.log('[host] reusing existing local server')
      return
    }
  } catch {
    // no existing server
  }

  await ensureRuntimeBundle()

  if (!await fileExists(serverEntry)) {
    throw new Error(`Embedded server bundle was not materialized at ${serverEntry}.`)
  }

  console.log(`[host] server entry: ${serverEntry}`)
  const nodeCommand = await resolveNodeCommand()
  console.log(`[host] using node runtime: ${nodeCommand}`)
  const command = new Deno.Command(nodeCommand, {
    args: [serverEntry],
    cwd: runtimeRoot,
    stdout: 'piped',
    stderr: 'piped',
    env: {
      ...Deno.env.toObject(),
      PORT: String(SERVER_PORT),
    },
  })

  serverProcess = command.spawn()
  console.log('[host] server process spawned')
  logStream('server', serverProcess.stdout)
  logStream('server:err', serverProcess.stderr)
  serverProcess.status.then((status) => {
    console.log('[host] server process exited', status)
  }).catch((error) => {
    console.error('[host] server process status error', error)
  })
}

async function stopServer() {
  if (!serverProcess) return
  try {
    serverProcess.kill('SIGTERM')
  } catch {
    // ignore
  }
  serverProcess = null
}

async function waitForServerReady(timeoutMs = 20000) {
  console.log('[host] waiting for local server readiness')
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${serverBase}/api/info`)
      if (response.ok) {
        const info = await response.json() as { mobileUrls?: string[] }
        mobileUrl = info.mobileUrls?.[0] || `${serverBase}/`
        console.log('[host] local server is ready', mobileUrl)
        return
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Timed out waiting for local server to become ready')
}

function ensureHubWindow() {
  if (hubWindow && !hubWindow.isClosed()) {
    return hubWindow
  }

  hubWindow = new Deno.BrowserWindow({
    title: '纸杯电台总台',
    width: 860,
    height: 1120,
  })

  hubWindow.addEventListener('close', (event: Event & { preventDefault(): void }) => {
    event.preventDefault()
    hubWindow?.hide()
  })

  return hubWindow
}

async function probeHubWindow(label: string) {
  if (!hubWindow || hubWindow.isClosed()) return
  try {
    const result = await hubWindow.executeJs(`JSON.stringify({
      href: location.href,
      title: document.title,
      readyState: document.readyState,
      bodyText: document.body ? document.body.innerText.slice(0, 120) : null,
      bodyChildren: document.body ? document.body.childElementCount : -1
    })`)
    console.log(`[hub-probe:${label}]`, result)
  } catch (error) {
    console.error(`[hub-probe:${label}] failed`, error)
  }
}

function openHub() {
  const win = ensureHubWindow()
  const hubUrl = `${internalServeBase}/d`
  console.log('[host] navigating proxied hub ->', hubUrl)
  win.navigate(hubUrl)
  win.show()
  win.focus()
  setTimeout(() => { probeHubWindow('after-500ms') }, 500)
  setTimeout(() => { probeHubWindow('after-1500ms') }, 1500)
}

async function copyToClipboard(text: string) {
  await fetch(`${serverBase}/api/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

async function showNativeNotification(title: string, body: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return
  }
  const notification = new Notification(title, { body })
  notification.addEventListener('click', () => openHub())
}

function ensureTray() {
  if (tray) return tray

  tray = new Deno.Tray()
  tray.setIcon(trayIconBytes)
  tray.setTooltip('纸杯电台 / Paper Cup Radio')
  tray.setMenu([
    { item: { id: 'open-hub', label: 'Open Hub', enabled: true } },
    { item: { id: 'copy-mobile-url', label: 'Copy Mobile URL', enabled: true } },
    'separator',
    { item: { id: 'quit', label: 'Quit', enabled: true } },
  ])

  tray.addEventListener('click', () => openHub())
  tray.addEventListener('menuclick', async (event: CustomEvent<{ id: string }>) => {
    switch (event.detail.id) {
      case 'open-hub':
        openHub()
        break
      case 'copy-mobile-url':
        await copyToClipboard(mobileUrl)
        await showNativeNotification(APP_NAME, '手机访问地址已复制到剪贴板')
        break
      case 'quit':
        await stopServer()
        Deno.exit(0)
        break
    }
  })

  return tray
}

function connectHostSocket() {
  const socket = new WebSocket(`${serverBase.replace('http', 'ws')}/ws`)

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'hello', ...DESKTOP_CLIENT }))
  })

  socket.addEventListener('message', async (event) => {
    const payload = JSON.parse(String(event.data)) as {
      type?: string
      entry?: { id: string; deviceName: string }
      clipboard?: { ok: boolean }
      paste?: { attempted: boolean; ok: boolean }
    }

    if (payload.type === 'history:add' && payload.entry && payload.entry.id !== lastHistoryId) {
      lastHistoryId = payload.entry.id
      tray?.setTooltip(`纸杯电台 · 最新来自 ${payload.entry.deviceName}`)

      const settingsResponse = await fetch(`${serverBase}/api/settings`).catch(() => null)
      const settings = settingsResponse?.ok
        ? await settingsResponse.json() as { notificationsEnabled?: boolean }
        : null
      if (settings?.notificationsEnabled === false) return

      const body = payload.paste?.attempted
        ? (payload.paste.ok ? '已直接粘贴到当前输入框' : payload.clipboard?.ok ? '已复制到剪贴板，直接粘贴未完成' : '新输入已到达')
        : (payload.clipboard?.ok ? '已自动复制到本机剪贴板' : '新输入已到达')
      await showNativeNotification(
        `来自 ${payload.entry.deviceName} 的新播报`,
        body,
      )
    }
  })

  socket.addEventListener('close', () => {
    setTimeout(connectHostSocket, 1000)
  })
}

async function main() {
  console.log('[host] main begin')
  console.log('[host] main before startServer')
  await startServer()
  console.log('[host] main after startServer')
  console.log('[host] main before waitForServerReady')
  await waitForServerReady()
  console.log('[host] main after waitForServerReady')
  console.log('[host] main before ensureTray')
  ensureTray()
  console.log('[host] tray ready')
  console.log('[host] main before openHub')
  openHub()
  console.log('[host] hub requested')
  connectHostSocket()
  console.log('[host] websocket listener attached')
}

addEventListener('beforeunload', () => {
  stopServer().catch(() => undefined)
})

try {
  await main()
} catch (error) {
  console.error('[host] fatal startup error', error)
  throw error
}
