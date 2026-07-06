import { ClientProfile, DraftItem, ServerEvent, createClientId, suggestDeviceName } from './shared'
import { initScene, initTheme } from './theme'

const PROFILE_KEY = 'remote-input-demo:profile'
const DRAFT_KEY = 'remote-input-demo:draft'

const editor = document.getElementById('editor') as HTMLTextAreaElement
const draftHint = document.getElementById('draft-hint') as HTMLSpanElement
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const setupCard = document.getElementById('setup-card') as HTMLDivElement
const editorShell = document.getElementById('editor-shell') as HTMLDivElement
const deviceNameInput = document.getElementById('device-name-input') as HTMLInputElement
const saveDeviceBtn = document.getElementById('save-device-btn') as HTMLButtonElement
const shuffleNameBtn = document.getElementById('shuffle-name-btn') as HTMLButtonElement
const themeToggleBtn = document.getElementById('theme-toggle-btn') as HTMLButtonElement | null

let ws: WebSocket | null = null
let sendTimer: number | undefined
let profile: ClientProfile | null = null
let initialized = false

interface LocalDraft {
  text: string
  selectionStart: number
  selectionEnd: number
}

function loadProfile(): ClientProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ClientProfile
  } catch {
    return null
  }
}

function saveProfile(nextProfile: ClientProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile))
}

function loadDraft(): LocalDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LocalDraft
  } catch {
    return null
  }
}

function saveDraft() {
  const draft: LocalDraft = {
    text: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  draftHint.textContent = `已缓存 · ${new Date().toLocaleTimeString()}`
}

function applyDraft(draft: Partial<DraftItem> | LocalDraft) {
  editor.value = draft.text || ''
  const start = Number(draft.selectionStart || 0)
  const end = Number(draft.selectionEnd || start)
  requestAnimationFrame(() => editor.setSelectionRange(start, end))
  saveDraft()
}

function setEditorEnabled(enabled: boolean) {
  editor.disabled = !enabled
  clearBtn.disabled = !enabled
  submitBtn.disabled = !enabled
}

function showSetup(show: boolean) {
  setupCard.classList.toggle('hidden', !show)
  editorShell.classList.toggle('hidden', show)
  if (show) {
    deviceNameInput.focus()
  }
}

async function registerProfile(currentProfile: ClientProfile) {
  const response = await fetch('/api/client/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentProfile),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'register failed')
  }
}

function queueDraftSync() {
  saveDraft()
  if (!ws || ws.readyState !== WebSocket.OPEN || !profile) return
  const currentProfile = profile
  window.clearTimeout(sendTimer)
  sendTimer = window.setTimeout(() => {
    ws?.send(JSON.stringify({
      type: 'draft:update',
      role: currentProfile.role,
      clientId: currentProfile.clientId,
      deviceName: currentProfile.deviceName,
      source: 'mobile',
      text: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    }))
  }, 80)
}

async function submitDraft() {
  if (!profile) return
  const text = editor.value
  if (!text.trim()) return

  submitBtn.disabled = true
  submitBtn.textContent = '发送中…'
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profile,
        text,
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'submit failed')
    applyDraft({ text: '', selectionStart: 0, selectionEnd: 0 })
    queueDraftSync()
  } catch (error) {
    alert(`发送失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = '发送到电脑'
  }
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${protocol}://${location.host}/ws`)

  ws.addEventListener('open', () => {
    if (profile) {
      ws?.send(JSON.stringify({ type: 'hello', ...profile }))
    }
  })

  ws.addEventListener('close', () => {
    setTimeout(connect, 1000)
  })

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as ServerEvent
    const currentProfile = profile

    if (message.type === 'init') {
      const localDraft = loadDraft()
      const myDraft = currentProfile ? message.drafts.find((item) => item.clientId === currentProfile.clientId) : undefined
      if (!initialized) {
        if (myDraft?.text) {
          applyDraft(myDraft)
        } else if (localDraft?.text) {
          applyDraft(localDraft)
          queueDraftSync()
        }
        initialized = true
      }
    }

    if (message.type === 'drafts:update' && currentProfile) {
      const myDraft = message.drafts.find((item) => item.clientId === currentProfile.clientId)
      if (myDraft && myDraft.source !== 'mobile') {
        applyDraft(myDraft)
      }
      if (!myDraft && !editor.value) {
        applyDraft({ text: '', selectionStart: 0, selectionEnd: 0 })
      }
    }
  })
}

shuffleNameBtn.addEventListener('click', () => {
  deviceNameInput.value = suggestDeviceName()
  deviceNameInput.focus()
  deviceNameInput.select()
})

saveDeviceBtn.addEventListener('click', async () => {
  const deviceName = deviceNameInput.value.trim()
  if (!deviceName) {
    alert('请先填写设备名称')
    return
  }

  const nextProfile: ClientProfile = {
    clientId: createClientId(),
    deviceName,
    role: 'mobile',
  }

  saveDeviceBtn.disabled = true
  saveDeviceBtn.textContent = '保存中…'
  try {
    await registerProfile(nextProfile)
    profile = nextProfile
    saveProfile(nextProfile)
    showSetup(false)
    setEditorEnabled(true)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect()
    } else {
      ws.send(JSON.stringify({ type: 'hello', ...nextProfile }))
    }
    editor.focus()
  } catch (error) {
    alert(`保存失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    saveDeviceBtn.disabled = false
    saveDeviceBtn.textContent = '保存并开始输入'
  }
})

editor.addEventListener('input', queueDraftSync)
editor.addEventListener('keyup', queueDraftSync)
editor.addEventListener('click', queueDraftSync)
editor.addEventListener('select', queueDraftSync)
submitBtn.addEventListener('click', submitDraft)
clearBtn.addEventListener('click', () => {
  applyDraft({ text: '', selectionStart: 0, selectionEnd: 0 })
  queueDraftSync()
})

initTheme(themeToggleBtn)
initScene(document.body)

profile = loadProfile()
deviceNameInput.value = profile?.deviceName || suggestDeviceName()
if (profile) {
  showSetup(false)
  setEditorEnabled(true)
  const localDraft = loadDraft()
  if (localDraft?.text) {
    applyDraft(localDraft)
  }
  registerProfile(profile).catch(() => undefined)
  connect()
  editor.focus()
} else {
  showSetup(true)
  setEditorEnabled(false)
}
