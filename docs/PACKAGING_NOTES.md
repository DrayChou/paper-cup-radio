# Paper Cup Radio Packaging Notes

## 这次 Windows 打包问题的根因总结

这次 Windows 目录版 / MSI 能打出来但不能正常用，不是单点问题，而是两层问题叠加：

### 1. Windows 宿主 backend 实际没有按预期走 CEF

虽然仓库里有 `desktop-host/deno.windows.json`，并写了 `backend: "cef"`，但实际打包结果证明：

- 原来的 Windows 包里出现的是 `laufey_webview.exe`
- 显式传 `--backend cef` 后，产物才变成：
  - `laufey.exe`
  - `libcef.dll`
  - `bootstrap.exe`
  - `locales/*`

经验：
- 不要只依赖 `--config deno.windows.json` 来切 Windows backend
- Windows 打包命令里直接显式传 `--backend cef` 更稳、更可验证

### 2. 桌面宿主仍按开发态去找 repo root 和外部 `dist/server.js`

最初 `desktop-host/main.ts` 的启动逻辑仍然假设：

- 运行时能推断出源码仓库根目录
- 外部存在 `dist/server.js`
- 外部存在 `public/*`

这对开发态成立，但对分发包不成立。

经验：
- 桌面分发包不能再依赖源码目录结构
- 分发态要做到真正自包含
- 宿主应把需要的 server / public 资源内嵌进去，并在运行时落盘到本机运行目录

### 3. 运行时落盘资源时，需要明确 `--allow-write`

这次改成“内嵌资源 -> 运行时落盘 -> 启动 Node 服务”后，又暴露出下一层问题：

- `deno desktop` 编译权限里没有 `--allow-write`
- 导致宿主无法把资源写到 `%LOCALAPPDATA%/PaperCupRadio`
- 应用启动后直接 fatal error

经验：
- 如果桌面宿主要在首次运行时写运行目录、缓存、资源或数据文件，构建权限必须包含 `--allow-write`

### 4. Windows 剪贴板中文乱码，不要依赖 PowerShell stdin 编码

原实现：
- Node 通过 `stdin.write(text, 'utf8')`
- PowerShell 用 `[Console]::In.ReadToEnd()` 读取

在 GUI 启动环境下，这条链的编码并不稳定，中文会被错码。

经验：
- Windows 剪贴板不要依赖控制台 stdin 编码
- 用 base64 传输文本，再在 PowerShell 里显式按 UTF-8 解码，更稳

### 5. 手机键盘弹起时，底部操作条不能依赖静态预留高度

原来手机输入页底部按钮区是静态布局：
- 键盘弹起后，发送按钮仍留在视口底部
- 实际被输入法盖住

经验：
- 移动端输入页应监听 `visualViewport`
- 用动态 `keyboard inset` 驱动底部工具条上移
- 提交按钮应跟随键盘边界，而不是依赖固定 padding

## 这次形成的 Windows 打包原则

### 本地打包原则

1. 先构建 web/server：
   - `npm run build`
2. Windows 包使用显式 CEF：
   - `deno task build:win`
   - `deno task build:win-msi`
3. Windows 目录版和 MSI 不要并行构建
   - 两者共享中间 staging / DLL 路径
   - 并行构建容易互相踩目录或文件
4. 打包前尽量停掉旧的 Windows 包进程
   - 特别是 `laufey.exe` / `laufey_webview.exe` / 运行中的 `node.exe`

### CI 原则

1. Windows 应尽量放到原生 Windows runner 上打包
   - Ubuntu 交叉产物不能证明 Windows 运行时真的可用
2. Windows 任务中：
   - 先打 MSI
   - 清 staging
   - 再打目录版
   - 或拆成两个独立 job
3. 最好补一个最小 smoke test：
   - 启动目录版
   - 等待数秒
   - 检查进程是否仍在
   - 读取 stdout/stderr
   - 结束时要杀整棵进程树，而不是只停父进程
   - 给 CEF 子进程释放文件锁留几秒缓冲，再压缩目录版
4. 不要让 CI 每次都重渲染图标
   - 默认复用仓库里的 `app.icns/app.ico/app.png/tray.png`
   - 改 SVG 时才手动跑 `deno task icons`

## 对 macOS / Linux 的影响判断

### 这次改动中偏 Windows 的部分

- Windows 任务显式改成 `--backend cef`
- Windows 剪贴板 UTF-8 修复
- Windows 打包与验证流程调整

### 这次改动中跨平台但方向正确的部分

- 宿主改为自包含运行，不再依赖外部 repo root
- 打包任务增加 `--allow-write`
- 图标默认复用版本库资产，不再每次重渲染

经验：
- 这些跨平台修改从架构上更适合分发包
- 但 macOS / Linux 仍应各自做一次原生 runner 验证，不能只靠静态判断

## 后续建议

1. 把 GitHub Actions 拆成：
   - macOS 原生 job
   - Windows 原生 job
   - Linux 原生 job
2. Windows job 增加启动 smoke test
3. 发布前保留一份简短 checklist：
   - 能启动
   - 能打开总台
   - 手机能连接
   - 剪贴板中文正常
   - 手机键盘弹起时发送按钮可见
   - 当前焦点输入框自动粘贴可用
4. 在没有证据证明 WebView2 路线已经恢复稳定之前，不要为了缩包过早回切底层 runtime
5. 后续如果继续产品化：
   - 评估 Windows WebView2 是否已经足够稳定，能否替代 CEF 以缩小包体积
   - 如果不能，再评估是否要拆分 runtime 下载或更换桌面壳
