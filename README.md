# Paper Cup Radio / 纸杯电台

一个本地多客户端 TypeScript 输入中继工具：

- 手机页 `/m`：输入 / 编辑 / 提交（默认入口 `/` 会直接跳转到这里）
- 纸杯电台总台 `/d`：查看在线纸杯、查看当前草稿、查看播报存档、复制某条到本机系统剪贴板
- 存储：`data/history.jsonl`，只追加，不修改
- 服务端行为：收到新提交后自动复制最新文本到运行服务这台电脑的剪贴板，并尝试弹提醒

## 技术栈

- TypeScript
- Express
- WebSocket (`ws`)
- esbuild

## 运行

```bash
npm install
npm start
```

启动后：

- 手机默认入口：`http://<你的局域网IP>:8765/`（会直接进 `/m`）
- 纸杯电台总台：`http://localhost:8765/d`

## 当前能力

- 一个服务端，多个客户端
- 客户端首次输入设备名称，本地保存 `clientId + deviceName`
- 手机草稿实时同步到纸杯电台总台
- 手机提交后，服务端追加一条 JSONL 历史记录
- 每条历史记录带上 `clientId / deviceName / userAgent / remoteAddress`
- 服务端自动复制最新提交到本机系统剪贴板
- 桌面页支持浏览器提醒和再次复制

## 开发命令

```bash
npm run build
npm run check
npm start
```

## 说明

这还是第一阶段 demo，暂不直接改写桌面焦点输入框。
后续可在此基础上加：

- 复制后自动尝试粘贴到当前焦点
- Windows/macOS helper
- 真正的焦点输入框注入
