# Paper Cup Radio v0.1.1

## 简介

这是一版面向测试同事的桌面测试包更新，重点修复了 Windows 打包后无法正常启动、中文剪贴板乱码，以及手机输入法遮挡发送按钮的问题。

## 本版重点

- Windows 桌面包改为显式使用 CEF backend，绕开 WebView2 初始化链上的不稳定问题
- Windows 宿主改为自包含启动：首次运行会把内嵌的 server / public 资源落盘到本机运行目录，再拉起本地服务
- 修复 Windows 剪贴板中文乱码
- 修复手机端输入法弹起后，发送按钮容易被键盘遮住的问题

## 下载说明

### macOS
- `PaperCupRadio-macos-app.zip`

### Windows
- `PaperCupRadio-windows-dir.zip`
- `PaperCupRadio.msi`

### Linux
- `PaperCupRadio.AppImage`
- `paper-cup-radio.deb`
- `paper-cup-radio.rpm`

## 测试重点

- Windows 目录版 / MSI 是否能正常启动，并打开总台窗口
- 手机页是否能正常命名、输入、发送
- 手机输入法弹起后，发送按钮是否始终可见
- Windows 自动复制到剪贴板后，中文是否仍然乱码
- 深浅色切换是否正常
- 多台设备同时连接时来源是否正确

## 已知限制

- 当前仍以“复制到剪贴板”为主，不直接改写桌面焦点输入框
- Deno Desktop 宿主仍属于 POC 阶段
- macOS / Linux 这次主要做了静态兼容性调整，建议在原生 runner 或真机上各补一次打包验证

## 反馈方式

请反馈：
1. 操作系统与版本
2. 使用的是哪个安装包 / 压缩包
3. 复现步骤
4. 实际结果
5. 预期结果
6. 截图 / 录屏（如有）
