# Paper Cup Radio Desktop Host

这是 `paper-cup-radio` 的桌面宿主原型。它负责把已有的本地 HTTP / WebSocket 服务包进一个桌面应用里，并补上托盘、桌面窗口、原生通知，以及跨平台测试包构建。

## 目标

- 保留手机浏览器输入页，手机默认访问根路径 `/`
- 保留当前 Node / TypeScript 本地服务
- 增加桌面 tray、纸杯电台总台窗口、原生通知
- 提供 macOS、Windows、Linux 可分发产物

## 开发运行

```bash
cd ..
npm run build
cd desktop-host
deno task check
deno task dev
```

开发运行时：
- `deno task dev` 使用 `--hmr`
- 宿主会尝试在父目录运行已构建好的 `dist/server.js`
- 如果 GUI 环境找不到 Node，可设置 `REMOTE_INPUT_NODE=/绝对路径/node`
- 如果运行目录被缓存路径干扰，可设置 `REMOTE_INPUT_REPO_ROOT=~/Code/remote-input-demo`

## 生成图标与构建产物

```bash
deno task icons

deno task build
deno task build:win
deno task build:win-msi
deno task build:linux-appimage
deno task build:linux-deb
deno task build:linux-rpm
```

当前产物：
- `dist/PaperCupRadio.app`
- `dist/windows/PaperCupRadio/`
- `dist/windows/PaperCupRadio.msi`
- `dist/linux/PaperCupRadio.AppImage`
- `dist/linux/paper-cup-radio.deb`
- `dist/linux/paper-cup-radio.rpm`

## 图标资源

- `icons/app.svg`：主图标源文件
- `icons/tray.svg`：托盘图标
- `icons/app.icns` / `icons/app.ico` / `icons/app.png`：生成后的分发资源

## GitHub Actions 自动打包

仓库包含 `.github/workflows/build-desktop.yml`，支持：
- push 到 `main` 自动打包
- `workflow_dispatch` 手动触发打包
- 上传 macOS、Windows、Linux 多平台 artifacts

Linux 和 Windows runner 上没有 `iconutil`，因此 `build-icons.sh` 会跳过 `app.icns` 生成，但仍然继续生成 `app.ico`、`app.png` 和 `tray.png`，不影响跨平台构建。

## 当前说明

这还是 host-first POC，业务层仍然保留在主项目的 Node 服务里。宿主负责把它变成一个更接近桌面产品的测试包。

平台后端策略：
- macOS / Linux：默认 `webview`
- Windows：使用 `cef`，规避当前 Deno Desktop 在 Windows `webview` / WebView2 初始化链上的已知崩溃问题
