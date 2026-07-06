declare namespace Deno {
  interface MenuClickDetail {
    id: string
  }

  class BrowserWindow extends EventTarget {
    constructor(options?: {
      title?: string
      width?: number
      height?: number
      x?: number
      y?: number
      resizable?: boolean
      alwaysOnTop?: boolean
      frameless?: boolean
      noActivate?: boolean
      transparentTitlebar?: boolean
    })
    readonly windowId: number
    navigate(url: string): void
    show(): void
    hide(): void
    focus(): void
    close(): void
    isClosed(): boolean
    isVisible(): boolean
    executeJs(source: string): Promise<unknown>
    addEventListener(type: 'close', listener: (event: Event & { preventDefault(): void }) => void): void
  }

  class Tray extends EventTarget {
    readonly trayId: number
    setIcon(bytes: Uint8Array): void
    setTooltip(value: string | null): void
    setMenu(items: Array<{ item: { id: string; label: string; enabled: boolean } } | 'separator'> | null): void
    addEventListener(type: 'click', listener: () => void): void
    addEventListener(type: 'menuclick', listener: (event: CustomEvent<MenuClickDetail>) => void): void
    destroy(): void
  }
}
