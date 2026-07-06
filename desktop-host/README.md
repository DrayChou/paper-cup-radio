# Paper Cup Radio Desktop Host

这是给 `paper-cup-radio` 添加桌面宿主层的最小 POC。

## 目标

- 保留当前手机浏览器界面（手机默认访问根路径 `/`，服务端会跳到 `/m`）
- 保留当前 Node/TypeScript 本地服务
- 新增桌面 tray / 纸杯电台总台窗口 / 原生通知宿主

## 运行

```bash
cd ..
npm run build
cd desktop-host
deno task check
# 开发运行，真正启动宿主
deno task dev

# 生成图标资源
deno task icons

# macOS app
deno task build
# open ./dist/PaperCupRadio.app

# Windows 目录版和 MSI
deno task build:win
deno task build:win-msi
```

运行后：

- `deno task dev` 使用 `--hmr`，会真正进入开发运行态，而不只是产出 `.app`
- 宿主会尝试在父目录运行已构建好的 `dist/server.js`
- 如果 GUI 环境找不到 Node，可设置 `REMOTE_INPUT_NODE=/绝对路径/node`
- 如果运行目录被缓存路径干扰，可设置 `REMOTE_INPUT_REPO_ROOT=~/Code/remote-input-demo`
- 手机继续访问局域网首页 `/`，默认跳转到 `/m`
- 宿主窗口通过内置反向代理打开纸杯电台总台 `/d`

## 当前产物

- `dist/PaperCupRadio.app`
- `dist/windows/PaperCupRadio/`
- `dist/windows/PaperCupRadio.msi`

## 图标资源

- `icons/app.svg`：主图标源文件
- `icons/tray.svg`：托盘图标
- `icons/app.icns` / `icons/app.ico` / `icons/app.png`：可分发资源

目前为了保证 Deno Desktop 的跨平台打包稳定，应用 bundle 仍使用运行时默认窗口图标，托盘图标已经切到自定义 SVG。图标资源已准备好，后续可继续接到更稳定的 bundle icon 流程里。

## 说明

这是 host-first POC，还没有迁移业务层到 Deno。
