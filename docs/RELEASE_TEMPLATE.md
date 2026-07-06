# Paper Cup Radio Release Template

> 用于 GitHub Release 文案。将方括号内容替换成实际版本与说明。

## 标题

`Paper Cup Radio [版本号]`

## 简介

这是一版面向测试同事的桌面测试包更新。

## 本版重点

- [功能 / 体验改进 1]
- [功能 / 体验改进 2]
- [功能 / 体验改进 3]

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

- 手机页是否能正常命名、输入、发送
- 总台窗口是否能看到播报存档
- 自动复制到剪贴板是否稳定
- 深浅色切换是否正常
- 多台设备同时连接时来源是否正确

## 已知限制

- 当前仍以“复制到剪贴板”为主，不直接改写桌面焦点输入框
- Deno Desktop 宿主仍属于 POC 阶段

## 反馈方式

请反馈：
1. 操作系统与版本
2. 使用的是哪个安装包 / 压缩包
3. 复现步骤
4. 实际结果
5. 预期结果
6. 截图 / 录屏（如有）
