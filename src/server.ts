import fs from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import crypto from 'crypto'
import { spawn } from 'child_process'
import express, { Request } from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import { ClientProfile, ClientSummary, DraftItem, HistoryEntry, ServerEvent, ServerInfo } from './shared'

const PORT = Number(process.env.PORT || 8765)
const HOST = process.env.HOST || '0.0.0.0'
const DATA_DIR = path.join(process.cwd(), 'data')
const HISTORY_FILE = path.join(DATA_DIR, 'history.jsonl')

fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, '')
}

function loadHistory(): HistoryEntry[] {
  const raw = fs.readFileSync(HISTORY_FILE, 'utf8')
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as HistoryEntry]
      } catch (error) {
        console.warn('Skip bad JSONL line:', error)
        return []
      }
    })
}

const history: HistoryEntry[] = loadHistory()
const drafts = new Map<string, DraftItem>()
const clientRegistry = new Map<string, ClientSummary>()

function appendHistory(entry: HistoryEntry) {
  fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(entry)}\n`, 'utf8')
  history.push(entry)
}

function getLanIps(): string[] {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        ips.push(entry.address)
      }
    }
  }
  return [...new Set(ips)]
}

function getInfo(): ServerInfo {
  const lanIps = getLanIps()
  return {
    port: PORT,
    desktopUrl: `http://localhost:${PORT}/d`,
    mobileUrls: lanIps.map((ip) => `http://${ip}:${PORT}/`),
    historyFile: HISTORY_FILE,
  }
}

function serializeDrafts(): DraftItem[] {
  return [...drafts.values()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

function getClientSummary(): ClientSummary[] {
  return [...clientRegistry.values()].sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)))
}

function broadcast(payload: ServerEvent) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

function buildRequestMeta(req: Pick<Request, 'ip' | 'socket' | 'get'>) {
  return {
    userAgent: String(req.get('user-agent') || ''),
    remoteAddress: String(req.ip || req.socket?.remoteAddress || ''),
  }
}

function touchClient(input: ClientProfile & { userAgent: string; remoteAddress: string }): ClientSummary {
  const previous = clientRegistry.get(input.clientId)
  const next: ClientSummary = {
    clientId: input.clientId,
    deviceName: input.deviceName || previous?.deviceName || 'Unnamed device',
    role: input.role || previous?.role || 'mobile',
    userAgent: input.userAgent || previous?.userAgent || '',
    remoteAddress: input.remoteAddress || previous?.remoteAddress || '',
    lastSeenAt: new Date().toISOString(),
  }
  clientRegistry.set(next.clientId, next)
  return next
}

function setDraft(input: DraftItem): DraftItem {
  const draft: DraftItem = {
    clientId: input.clientId,
    deviceName: input.deviceName,
    role: input.role,
    text: String(input.text || ''),
    selectionStart: Number(input.selectionStart || 0),
    selectionEnd: Number(input.selectionEnd || 0),
    updatedAt: new Date().toISOString(),
    source: input.source || input.role,
  }

  if (draft.text.trim()) {
    drafts.set(draft.clientId, draft)
  } else {
    drafts.delete(draft.clientId)
  }

  broadcast({ type: 'drafts:update', drafts: serializeDrafts() })
  return draft
}

function writeToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let child

    if (process.platform === 'darwin') {
      child = spawn('pbcopy')
    } else if (process.platform === 'win32') {
      const base64 = Buffer.from(text, 'utf8').toString('base64')
      const command = [
        '$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($env:PAPER_CUP_RADIO_CLIPBOARD_BASE64));',
        'Set-Clipboard -Value $text;',
      ].join(' ')
      child = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
        env: {
          ...process.env,
          PAPER_CUP_RADIO_CLIPBOARD_BASE64: base64,
        },
      })
    } else {
      reject(new Error('Clipboard copy is only implemented for macOS and Windows in this demo.'))
      return
    }

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `clipboard command exited with code ${code}`))
    })

    if (process.platform === 'darwin') {
      child.stdin.write(text, 'utf8')
      child.stdin.end()
    }
  })
}

function pasteFromClipboardToFocusedWindow(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      resolve()
      return
    }

    const command = [
      '$wshell = New-Object -ComObject WScript.Shell;',
      'Start-Sleep -Milliseconds 120;',
      "$wshell.SendKeys('^v');",
    ].join(' ')
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', command])

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr || `paste command exited with code ${code}`))
    })
  })
}

function notifyDesktop(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      const child = spawn('osascript', ['-e', `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
      return
    }

    if (process.platform === 'win32') {
      const command = [
        'Add-Type -AssemblyName System.Windows.Forms;',
        '$n = New-Object System.Windows.Forms.NotifyIcon;',
        '$n.Icon = [System.Drawing.SystemIcons]::Information;',
        `$n.BalloonTipTitle = ${JSON.stringify(title)};`,
        `$n.BalloonTipText = ${JSON.stringify(message)};`,
        '$n.Visible = $true;',
        '$n.ShowBalloonTip(5000);',
        'Start-Sleep -Milliseconds 5500;',
        '$n.Dispose();',
      ].join(' ')
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', command])
      child.on('close', () => resolve())
      child.on('error', () => resolve())
      return
    }

    resolve()
  })
}

const app = express()
app.use(express.json({ limit: '64kb' }))
app.use(express.static(path.join(process.cwd(), 'public')))

app.get('/', (_req, res) => {
  res.redirect('/m')
})

app.get('/m', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'mobile.html'))
})

app.get('/d', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'desktop.html'))
})

app.get('/api/info', (_req, res) => {
  res.json(getInfo())
})

app.get('/api/history', (_req, res) => {
  res.json({ items: history.slice().reverse() })
})

app.get('/api/state', (_req, res) => {
  res.json({ drafts: serializeDrafts(), clients: getClientSummary(), historyCount: history.length })
})

app.post('/api/client/register', (req, res) => {
  const clientId = String(req.body?.clientId || '').trim()
  const deviceName = String(req.body?.deviceName || '').trim()
  const role = (String(req.body?.role || 'mobile') as ClientProfile['role'])

  if (!clientId || !deviceName) {
    res.status(400).json({ ok: false, error: 'clientId and deviceName are required' })
    return
  }

  const client = touchClient({ clientId, deviceName, role, ...buildRequestMeta(req) })
  broadcast({ type: 'clients:update', clients: getClientSummary() })
  res.json({ ok: true, client })
})

app.post('/api/submit', async (req, res) => {
  const text = String(req.body?.text || '')
  const clientId = String(req.body?.clientId || '').trim()
  const deviceName = String(req.body?.deviceName || '').trim()
  const role = (String(req.body?.role || 'mobile') as ClientProfile['role'])

  if (!text.trim()) {
    res.status(400).json({ ok: false, error: 'text is required' })
    return
  }
  if (!clientId || !deviceName) {
    res.status(400).json({ ok: false, error: 'client identity is required' })
    return
  }

  const client = touchClient({ clientId, deviceName, role, ...buildRequestMeta(req) })
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    clientId: client.clientId,
    deviceName: client.deviceName,
    role: client.role,
    text,
    createdAt: new Date().toISOString(),
    userAgent: client.userAgent,
    remoteAddress: client.remoteAddress,
  }

  appendHistory(entry)
  setDraft({
    clientId: client.clientId,
    deviceName: client.deviceName,
    role: client.role,
    text: '',
    selectionStart: 0,
    selectionEnd: 0,
    updatedAt: new Date().toISOString(),
    source: 'system',
  })

  const clipboard = { ok: false, error: null as string | null }
  const paste = { attempted: process.platform === 'win32', ok: false, error: null as string | null }
  try {
    await writeToClipboard(entry.text)
    clipboard.ok = true
  } catch (error) {
    clipboard.error = error instanceof Error ? error.message : String(error)
  }

  if (paste.attempted && clipboard.ok) {
    try {
      await pasteFromClipboardToFocusedWindow()
      paste.ok = true
    } catch (error) {
      paste.error = error instanceof Error ? error.message : String(error)
    }
  }

  const desktopNotice = clipboard.ok
    ? (paste.ok ? `来自 ${entry.deviceName} 的新输入已到达，并已直接粘贴到当前输入框` : `来自 ${entry.deviceName} 的新输入已到达，并已复制到剪贴板`)
    : `来自 ${entry.deviceName} 的新输入已到达`

  notifyDesktop('Paper Cup Radio', desktopNotice).catch(() => undefined)

  broadcast({ type: 'history:add', entry, clipboard, paste })
  broadcast({ type: 'clients:update', clients: getClientSummary() })
  res.json({ ok: true, entry, clipboard, paste })
})

app.post('/api/draft', (req, res) => {
  const clientId = String(req.body?.clientId || '').trim()
  const deviceName = String(req.body?.deviceName || '').trim()
  const role = (String(req.body?.role || 'mobile') as ClientProfile['role'])

  if (!clientId || !deviceName) {
    res.status(400).json({ ok: false, error: 'client identity is required' })
    return
  }

  const client = touchClient({ clientId, deviceName, role, ...buildRequestMeta(req) })
  const draft = setDraft({
    clientId: client.clientId,
    deviceName: client.deviceName,
    role: client.role,
    text: String(req.body?.text || ''),
    selectionStart: Number(req.body?.selectionStart || 0),
    selectionEnd: Number(req.body?.selectionEnd || 0),
    updatedAt: new Date().toISOString(),
    source: String(req.body?.source || role),
  })

  broadcast({ type: 'clients:update', clients: getClientSummary() })
  res.json({ ok: true, draft })
})

app.post('/api/copy', async (req, res) => {
  const text = String(req.body?.text || '')
  if (!text) {
    res.status(400).json({ ok: false, error: 'text is required' })
    return
  }

  try {
    await writeToClipboard(text)
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})

app.post('/api/history/:id/copy', async (req, res) => {
  const entry = history.find((item) => item.id === req.params.id)
  if (!entry) {
    res.status(404).json({ ok: false, error: 'entry not found' })
    return
  }

  try {
    await writeToClipboard(entry.text)
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket, req) => {
  const fakeReq = {
    get(name: string) {
      return req.headers[name.toLowerCase()]
    },
    ip: req.socket.remoteAddress,
    socket: req.socket,
  } as Pick<Request, 'get' | 'ip' | 'socket'>

  socket.send(JSON.stringify({
    type: 'init',
    drafts: serializeDrafts(),
    clients: getClientSummary(),
    history: history.slice().reverse(),
    info: getInfo(),
  } satisfies ServerEvent))

  socket.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString()) as Record<string, unknown>
      if (payload.type === 'hello') {
        const client = touchClient({
          clientId: String(payload.clientId || ''),
          deviceName: String(payload.deviceName || ''),
          role: (String(payload.role || 'mobile') as ClientProfile['role']),
          ...buildRequestMeta(fakeReq),
        })
        socket.send(JSON.stringify({ type: 'hello:ack', client } satisfies ServerEvent))
        broadcast({ type: 'clients:update', clients: getClientSummary() })
      }

      if (payload.type === 'draft:update') {
        const client = touchClient({
          clientId: String(payload.clientId || ''),
          deviceName: String(payload.deviceName || ''),
          role: (String(payload.role || 'mobile') as ClientProfile['role']),
          ...buildRequestMeta(fakeReq),
        })
        setDraft({
          clientId: client.clientId,
          deviceName: client.deviceName,
          role: client.role,
          text: String(payload.text || ''),
          selectionStart: Number(payload.selectionStart || 0),
          selectionEnd: Number(payload.selectionEnd || 0),
          updatedAt: new Date().toISOString(),
          source: String(payload.source || client.role),
        })
        broadcast({ type: 'clients:update', clients: getClientSummary() })
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : String(error) } satisfies ServerEvent))
    }
  })
})

server.listen(PORT, HOST, () => {
  const info = getInfo()
  console.log('Paper Cup Radio is running.')
  console.log(`Desktop: ${info.desktopUrl}`)
  if (info.mobileUrls.length) {
    console.log('Mobile:')
    for (const url of info.mobileUrls) {
      console.log(`  ${url}`)
    }
  } else {
    console.log('Mobile: no LAN IPv4 address detected yet.')
  }
  console.log(`JSONL: ${info.historyFile}`)
})
