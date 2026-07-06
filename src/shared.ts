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

const DEVICE_ADJECTIVES = [
  '晚班的',
  '走线的',
  '回声里的',
  '沙沙响的',
  '被风吹歪的',
  '躲雨的',
  '值夜的',
  '收讯不稳的',
  '听海的',
  '压线的',
  '跑调的',
  '绕远路的',
  '纸边卷起的',
  '口袋里的',
  '冒失的',
  '慢半拍的',
  '临时接线的',
  '靠窗的',
  '天线歪掉的',
  '踩着月光的',
  '守着总台的',
  '被咖啡烫过的',
  '晃来晃去的',
  '捎口信的',
  '夜色里的',
  '掉进海风里的',
  '背着电线的',
  '纸绳打结的',
  '偷听月亮的',
  '守门的',
  '站岗的',
  '楼梯口的',
  '会串台的',
  '唱反调的',
  '被海盐腌过的',
  '风口上的',
  '轻微卡顿的',
  '慢悠悠的',
  '总爱走神的',
  '打哈欠的',
  '偷偷眨眼的',
  '被晚霞照亮的',
  '凌晨三点的',
  '纸壳发烫的',
  '像口令一样的',
  '藏在书包里的',
  '沿着电线爬回来的',
  '总台认证的',
]

const DEVICE_NOUNS = [
  '纸杯',
  '纸卷',
  '总台',
  '电台',
  '口信员',
  '海獭',
  '信鸽',
  '鲸鱼',
  '雨靴',
  '橘子汽水',
  '录音带',
  '木夹子',
  '猫头鹰',
  '小喇叭',
  '便笺',
  '潮汐灯',
  '风铃',
  '山雀',
  '铅笔盒',
  '小灯塔',
  '旧收音机',
  '车票',
  '气球',
  '麦穗',
  '糖纸',
  '小转盘',
  '话务员',
  '电报码',
  '玻璃瓶',
  '邮差包',
  '旧天线',
  '月台广播',
  '海边报亭',
  '纸飞机',
  '小海螺',
  '黄铜铃',
  '手摇电话',
  '便携电台',
  '柠檬糖',
  '晚风收件员',
  '云朵打字机',
  '迷你总机',
  '口袋灯塔',
  '老式秒表',
  '纸绳信使',
  '回音室',
  '通话暗号',
]

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function suggestDeviceName(): string {
  return `${pickRandom(DEVICE_ADJECTIVES)}${pickRandom(DEVICE_NOUNS)}`
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
