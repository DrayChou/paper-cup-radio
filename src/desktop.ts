import { ClientSummary, DraftItem, HistoryEntry, ServerEvent, ServerInfo } from './shared'
import { initScene, initTheme } from './theme'

const wsDot = document.getElementById('ws-dot') as HTMLSpanElement
const wsLabel = document.getElementById('ws-label') as HTMLSpanElement
const infoList = document.getElementById('info-list') as HTMLDivElement
const historyList = document.getElementById('history-list') as HTMLDivElement
const historyCount = document.getElementById('history-count') as HTMLSpanElement
const draftsList = document.getElementById('drafts-list') as HTMLDivElement
const draftsCount = document.getElementById('drafts-count') as HTMLSpanElement
const clientsList = document.getElementById('clients-list') as HTMLDivElement
const clientsCount = document.getElementById('clients-count') as HTMLSpanElement
const latestBanner = document.getElementById('latest-banner') as HTMLDivElement
const notifyBtn = document.getElementById('notify-btn') as HTMLButtonElement
const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement
const navButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-panel-target]')]
const panels = {
  history: document.getElementById('panel-history') as HTMLElement,
  clients: document.getElementById('panel-clients') as HTMLElement,
  info: document.getElementById('panel-info') as HTMLElement,
}

let ws: WebSocket | null = null
let lastNotifiedId: string | null = null
let notificationsEnabled = true

const state: {
  info: ServerInfo | null
  drafts: DraftItem[]
  history: HistoryEntry[]
  clients: ClientSummary[]
} = {
  info: null,
  drafts: [],
  history: [],
  clients: [],
}

function setStatus(ok: boolean, label: string) {
  wsDot.classList.toggle('ok', ok)
  wsLabel.textContent = label
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

function renderInfo() {
  if (!state.info) return
  const mobileUrls = state.info.mobileUrls.length
    ? state.info.mobileUrls.map((url) => `<code>${escapeHtml(url)}</code>`).join('<br/>')
    : '<span class="muted-small">暂未检测到局域网 IPv4</span>'
  infoList.innerHTML = `
    <div>桌面页：<code>${escapeHtml(state.info.desktopUrl)}</code></div>
    <div>手机页：${mobileUrls}</div>
    <div>JSONL：<code>${escapeHtml(state.info.historyFile)}</code></div>
  `
}

function renderClients() {
  clientsCount.textContent = `${state.clients.length} 台`
  if (!state.clients.length) {
    clientsList.innerHTML = '<div class="empty-state">还没有客户端连上来。</div>'
    return
  }

  clientsList.innerHTML = state.clients.map((client) => `
    <div class="mini-card">
      <div class="label-row">
        <strong>${escapeHtml(client.deviceName)}</strong>
        <span class="device-chip">${escapeHtml(client.role)}</span>
      </div>
      <div class="muted-small">${escapeHtml(client.remoteAddress || 'unknown ip')}</div>
      <div class="muted-small">最后活动：${escapeHtml(formatTime(client.lastSeenAt))}</div>
    </div>
  `).join('')
}

function renderDrafts() {
  draftsCount.textContent = String(state.drafts.length)
  if (!state.drafts.length) {
    draftsList.innerHTML = '<div class="empty-state">当前没有客户端草稿。</div>'
    return
  }

  draftsList.innerHTML = state.drafts.map((draft) => `
    <div class="mini-card">
      <div class="label-row">
        <strong>${escapeHtml(draft.deviceName)}</strong>
        <span class="muted-small">${escapeHtml(formatTime(draft.updatedAt || new Date().toISOString()))}</span>
      </div>
      <pre>${escapeHtml(draft.text)}</pre>
      <div class="entry-footer">
        <span class="muted-small">光标：${draft.selectionStart}-${draft.selectionEnd}</span>
        <div class="entry-actions">
          <button class="copy" type="button" data-copy-draft="${escapeHtml(draft.clientId)}">复制这份草稿</button>
        </div>
      </div>
    </div>
  `).join('')

}

function renderHistory() {
  historyCount.textContent = String(state.history.length)
  if (!state.history.length) {
    historyList.innerHTML = '<div class="entry"><p class="subtle">还没有提交记录。</p></div>'
    return
  }

  historyList.innerHTML = state.history.map((item) => `
    <div class="entry">
      <div class="label-row">
        <strong>${escapeHtml(item.deviceName)}</strong>
        <span class="device-chip">${escapeHtml(formatTime(item.createdAt))}</span>
      </div>
      <pre>${escapeHtml(item.text)}</pre>
      <div class="entry-footer">
        <span class="muted-small">${escapeHtml(item.remoteAddress || 'unknown ip')}</span>
        <div class="entry-actions">
          <button class="copy" type="button" data-copy-id="${item.id}">再次复制</button>
        </div>
      </div>
    </div>
  `).join('')

}

async function copyText(text: string, endpoint = '/api/copy') {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'copy failed')
  }
}

async function runCopy(button: HTMLButtonElement, text: string, endpoint?: string) {
  const original = button.textContent || '复制'
  button.disabled = true
  button.textContent = '复制中…'
  try {
    await copyText(text, endpoint)
    button.textContent = '已复制'
  } catch (error) {
    alert(`复制失败：${error instanceof Error ? error.message : String(error)}`)
    button.textContent = original
  } finally {
    setTimeout(() => {
      button.disabled = false
      button.textContent = original
    }, 1200)
  }
}

function renderAll() {
  renderInfo()
  renderClients()
  renderDrafts()
  renderHistory()
}

let toastTimer: number | undefined

function showLatestBanner(
  entry: HistoryEntry,
  clipboard: { ok: boolean; error: string | null },
  paste?: { attempted: boolean; ok: boolean; error: string | null },
) {
  latestBanner.classList.remove('hidden')
  const statusText = paste?.attempted
    ? (paste.ok
      ? '已直接粘贴到当前输入框，并同步复制到剪贴板'
      : clipboard.ok
        ? '已复制到本机剪贴板，直接粘贴未完成'
        : `自动复制失败：${escapeHtml(clipboard.error || 'unknown error')}`)
    : (clipboard.ok ? '已自动复制到本机剪贴板' : `自动复制失败：${escapeHtml(clipboard.error || 'unknown error')}`)
  latestBanner.innerHTML = `
    <div class="toast-head">
      <strong>${escapeHtml(entry.deviceName)}</strong>
      <span class="muted-small">${escapeHtml(formatTime(entry.createdAt))}</span>
    </div>
    <div class="toast-body">${paste?.attempted && !paste.ok && paste.error ? `<span class="warning">${escapeHtml(statusText)}：${escapeHtml(paste.error)}</span>` : statusText}</div>
    <div class="toast-preview">${escapeHtml(entry.text)}</div>
  `
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    latestBanner.classList.add('hidden')
  }, 5200)
}

function maybeNotify(
  entry: HistoryEntry,
  clipboard: { ok: boolean; error: string | null },
  paste?: { attempted: boolean; ok: boolean; error: string | null },
) {
  if (lastNotifiedId === entry.id) return
  lastNotifiedId = entry.id
  showLatestBanner(entry, clipboard, paste)

  if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(`来自 ${entry.deviceName} 的新输入`, {
      body: paste?.attempted
        ? (paste.ok ? '已直接粘贴到当前输入框' : clipboard.ok ? '已复制到剪贴板，直接粘贴未完成' : '新输入已到达')
        : (clipboard.ok ? '已自动复制到本机剪贴板' : '新输入已到达'),
    })
  }
}

function renderNotificationButton() {
  notifyBtn.textContent = notificationsEnabled ? '关闭通知' : '开启通知'
  notifyBtn.setAttribute('aria-pressed', String(!notificationsEnabled))
  notifyBtn.title = notificationsEnabled
    ? '关闭系统与浏览器的新输入通知'
    : '开启系统与浏览器的新输入通知'
}

async function loadInitialData() {
  const [infoRes, historyRes, stateRes, settingsRes] = await Promise.all([
    fetch('/api/info'),
    fetch('/api/history'),
    fetch('/api/state'),
    fetch('/api/settings'),
  ])

  state.info = await infoRes.json() as ServerInfo
  state.history = (await historyRes.json() as { items: HistoryEntry[] }).items
  const snapshot = await stateRes.json() as { drafts: DraftItem[]; clients: ClientSummary[] }
  const savedSettings = await settingsRes.json() as { notificationsEnabled: boolean }
  state.drafts = snapshot.drafts
  state.clients = snapshot.clients
  notificationsEnabled = savedSettings.notificationsEnabled !== false
  renderNotificationButton()
  renderAll()
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${protocol}://${location.host}/ws`)

  ws.addEventListener('open', () => setStatus(true, '已连接'))
  ws.addEventListener('close', () => {
    setStatus(false, '已断开，重连中…')
    setTimeout(connect, 1000)
  })
  ws.addEventListener('error', () => setStatus(false, '连接异常'))
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as ServerEvent

    if (message.type === 'init') {
      state.info = message.info
      state.history = message.history
      state.drafts = message.drafts
      state.clients = message.clients
      renderAll()
    }

    if (message.type === 'drafts:update') {
      state.drafts = message.drafts
      renderDrafts()
    }

    if (message.type === 'clients:update') {
      state.clients = message.clients
      renderClients()
    }

    if (message.type === 'history:add') {
      state.history.unshift(message.entry)
      renderHistory()
      maybeNotify(message.entry, message.clipboard, message.paste)
    }
  })
}

draftsList.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-draft]')
  if (!button) return
  const clientId = button.dataset.copyDraft || ''
  const draft = state.drafts.find((item) => item.clientId === clientId)
  if (!draft) return
  await runCopy(button, draft.text)
})

function activatePanel(panelName: keyof typeof panels) {
  for (const [name, panel] of Object.entries(panels) as Array<[keyof typeof panels, HTMLElement]>) {
    panel.classList.toggle('hidden', name !== panelName)
  }
  for (const button of navButtons) {
    button.classList.toggle('active', button.dataset.panelTarget === panelName)
  }
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.panelTarget as keyof typeof panels
    activatePanel(target)
  })
})

historyList.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy-id]')
  if (!button) return
  const entry = state.history.find((item) => item.id === button.dataset.copyId)
  if (!entry) return
  await runCopy(button, entry.text, `/api/history/${entry.id}/copy`)
})

notifyBtn.addEventListener('click', async () => {
  const nextEnabled = !notificationsEnabled
  notifyBtn.disabled = true

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationsEnabled: nextEnabled }),
    })
    const result = await response.json() as { ok?: boolean; error?: string; settings?: { notificationsEnabled: boolean } }
    if (!response.ok) throw new Error(result.error || 'settings update failed')

    notificationsEnabled = result.settings?.notificationsEnabled ?? nextEnabled
    renderNotificationButton()

    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  } catch (error) {
    alert(`通知设置失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    notifyBtn.disabled = false
  }
})

initTheme(themeToggleBtn)
initScene(document.body)
activatePanel('history')
loadInitialData().then(connect)
