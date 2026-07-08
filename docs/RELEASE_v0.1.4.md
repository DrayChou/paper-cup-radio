# Paper Cup Radio v0.1.4

## 简介

这是一版面向测试同事的桌面测试包更新，重点新增 Windows Lite 版，并补齐当前焦点自动粘贴能力。

## 本版重点

- Windows Full 版继续保留自包含桌面壳，保证稳定可用
- 新增 Windows Lite 版：不再内嵌浏览器外壳，直接启动本地服务并打开系统默认浏览器访问 `/d`
- Windows 下支持“当前焦点输入框自动粘贴”，并保留剪贴板回退
- 修复 Windows 剪贴板中文乱码
- 修复手机端输入法弹起后，发送按钮和大输入框布局问题

## 下载说明

### macOS
- `PaperCupRadio-macos-app.zip`

### Windows
- `PaperCupRadio-windows-dir.zip`
- `PaperCupRadio.msi`
- `PaperCupRadioLite-windows.zip`

### Linux
- `PaperCupRadio.AppImage`
- `paper-cup-radio.deb`
- `paper-cup-radio.rpm`

## 测试重点

- Windows 目录版 / MSI 是否能正常启动，并打开总台窗口
- Windows Lite 版是否能正常启动本地服务，并自动打开系统默认浏览器到 `/d`
- 手机页是否能正常命名、输入、发送
- 当前焦点输入框自动粘贴是否可用
- 手机输入法弹起后，发送按钮和输入框布局是否正常
- Windows 自动复制到剪贴板后，中文是否仍然乱码
- 深浅色切换是否正常
- 多台设备同时连接时来源是否正确

## 已知限制

- 当前仍以“复制到剪贴板”为主，不直接做页面 DOM 级精确注入
- 当前焦点自动粘贴依赖前台窗口和当前焦点控件接受普通粘贴
- Deno Desktop 宿主仍属于 POC 阶段
- Linux Headless 方向本轮暂不纳入发布

## 反馈方式

请反馈：
1. 操作系统与版本
2. 使用的是哪个安装包 / 压缩包
3. 复现步骤
4. 实际结果
5. 预期结果
6. 截图 / 录屏（如有）
