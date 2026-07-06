export type ClientRole = 'mobile' | 'desktop'

export interface ClientProfile {
  clientId: string
  deviceName: string
  role: ClientRole
}

export interface ClientSummary extends ClientProfile {
  userAgent: string
  remoteAddress: string
  lastSeenAt: string
}

export interface DraftItem extends ClientProfile {
  text: string
  selectionStart: number
  selectionEnd: number
  updatedAt: string | null
  source: string
}

export interface HistoryEntry extends ClientProfile {
  id: string
  text: string
  createdAt: string
  userAgent: string
  remoteAddress: string
}

export interface ServerInfo {
  port: number
  desktopUrl: string
  mobileUrls: string[]
  historyFile: string
}

export type ServerEvent =
  | { type: 'init'; drafts: DraftItem[]; clients: ClientSummary[]; history: HistoryEntry[]; info: ServerInfo }
  | { type: 'hello:ack'; client: ClientSummary }
  | { type: 'drafts:update'; drafts: DraftItem[] }
  | { type: 'clients:update'; clients: ClientSummary[] }
  | { type: 'history:add'; entry: HistoryEntry; clipboard: { ok: boolean; error: string | null } }
  | { type: 'error'; error: string }

export function suggestDeviceName(): string {
  const ua = navigator.userAgent
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || 'Device'
  if (/iPhone/i.test(ua)) return '我的 iPhone'
  if (/iPad/i.test(ua)) return '我的 iPad'
  if (/Android/i.test(ua)) return '我的 Android'
  return `${platform} Client`
}

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}
