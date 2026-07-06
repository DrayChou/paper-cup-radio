# Paper Cup Radio / 纸杯电台

Paper Cup Radio 是一个把手机输入法和桌面工作流连接起来的小工具。你可以在手机浏览器里像对着线电话另一头说话一样输入内容，桌面端会立刻收到、展示、复制，并保留播报存档。

## 它能做什么

- 手机默认入口 `/`：命名设备后，直接输入、发送
- 纸杯电台总台 `/d`：查看在线纸杯、正在说话的草稿、播报存档
- 自动把最新一条内容复制到电脑剪贴板
- 多客户端接入，每条播报带来源设备、时间、UA、来源 IP
- JSONL 追加存储，简单、透明、可追溯

## 适合谁

- 经常用手机语音输入，但最终内容要落到电脑里的人
- 想把豆包、系统输入法、语音输入桥接到桌面的人
- 需要一个局域网内可自托管、低门槛的输入中继工具的人

## 本地运行

```bash
npm install
npm run build
npm start
```

启动后：

- 手机默认入口：`http://<你的局域网IP>:8765/`
- 纸杯电台总台：`http://localhost:8765/d`

## 开发命令

```bash
npm run check
npm run build
npm start
```

## 桌面宿主

项目自带一个 Deno Desktop 宿主原型，位于 `desktop-host/`，负责 tray、桌面窗口、原生通知和打包。

常用命令：

```bash
cd desktop-host
deno task check
deno task dev
deno task build
deno task build:win
deno task build:win-msi
```

## 给测试同事的说明

### macOS
1. 打开 `desktop-host/dist/PaperCupRadio.app`
2. 等待“纸杯电台总台”窗口弹出
3. 用手机访问宿主机局域网首页 `/`
4. 给纸杯命名后开始发送内容
5. 桌面端确认：最新播报、复制按钮、历史记录、浏览器提醒是否正常

### Windows
1. 运行 `desktop-host/dist/windows/PaperCupRadio/` 目录版，或者安装 `desktop-host/dist/windows/PaperCupRadio.msi`
2. 打开总台窗口
3. 用手机访问局域网首页 `/`
4. 给纸杯命名后发送内容
5. 检查剪贴板复制、通知、历史记录、再次复制是否正常

### 建议测试项
- 单设备连接是否稳定
- 多设备同时连接时来源设备是否正确
- 手机端发送按钮是否始终在首屏内
- 总台窗口是否会实时刷新最新播报
- 自动复制到剪贴板是否稳定
- 通知权限开启后是否能收到提醒

## 当前阶段说明

这还是第一阶段 demo，当前重点是：
- 把手机输入体验接到电脑
- 让桌面端稳定收到并处理最新内容

还没有做：
- 直接改写桌面焦点输入框
- 自动粘贴到当前焦点
- 更完整的宿主层产品化收口
