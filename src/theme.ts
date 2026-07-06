export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'paper-cup-radio:theme'
const SCENES = ['switchboard', 'attic', 'shoreline', 'sunset', 'midnight', 'rainy-alley'] as const

function getSystemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export function getSavedTheme(): ThemeMode | null {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

export function initTheme(button?: HTMLButtonElement | null) {
  const saved = getSavedTheme()
  const initial = saved ?? getSystemTheme()
  applyTheme(initial)
  syncThemeButton(button, initial)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    if (!getSavedTheme()) {
      const next = getSystemTheme()
      applyTheme(next)
      syncThemeButton(button, next)
    }
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onSystemChange)
  } else if (typeof media.addListener === 'function') {
    media.addListener(onSystemChange)
  }

  button?.addEventListener('click', () => {
    const current = (document.documentElement.dataset.theme as ThemeMode | undefined) ?? initial
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    syncThemeButton(button, next)
  })
}

export function initScene(target: HTMLElement = document.body) {
  const scene = SCENES[Math.floor(Math.random() * SCENES.length)]
  target.dataset.scene = scene
}

function syncThemeButton(button: HTMLButtonElement | null | undefined, mode: ThemeMode) {
  if (!button) return
  button.textContent = mode === 'dark' ? '切到浅色' : '切到深色'
}
