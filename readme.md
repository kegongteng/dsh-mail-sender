# dsh-mail-sender

DeepSeek Harness (DSH) 邮件通道插件：用户发邮件 → DSH 交给 agent → 回复自动用邮件发回。

- **常驻入口**：被动接收邮件驱动会话，不是等待模型调用的 Tool
- **标准协议**：IMAP IDLE 收信 / SMTP 回信，不绑定托管邮件服务
- **双向白名单**：同一份精确地址列表同时校验入站发件人与出站回复对象
- **每地址一个会话**：`sessionId = mail:<规范化地址>`，上下文连续
- **设置页 UI**：邮箱绑定表格、可增删白名单、IDLE 状态卡与测试连接

## 工作原理

```
来信 (IMAP IDLE / 60s 轮询)
   │  认证后探测 capability，决定 IDLE 或轮询
   ▼
AccessPolicy（纯函数）── 自动流量 / 非白名单 → 静默丢弃
   │  toJob 一次解析发件地址并生成 MailJob
   ▼
串行消费队列 → ctx.agents.get / resume / create
   │  agent.followup(正文)
   ▼
session/event（durable）
   │  assistant/message → 累积本轮 text
   │  turn/end completed → 取出回复
   ▼
SMTP 连接池回信（Re: + In-Reply-To + References）
```

## 安装

```bash
dsh plugin --profile web add dsh-mail-sender
```

安装后重启 `dsh web`。

## 设置页

打开 **Settings（设置）→ 邮件网关**：

| 区域 | 行为 |
|---|---|
| 邮箱绑定 | IMAP / SMTP 主机、端口、TLS、用户名、显示名；密码保存后只显示“已设置”，留空表示不修改 |
| 测试连接 | 用当前表单值临时建连并探测 IDLE，结果直接写入状态卡 |
| 白名单 | 输入回车添加、行尾删除、独立保存；保存只更新内存策略，不断开 IMAP |
| 状态卡 | 正在连接 / 支持 IDLE / 不支持 IDLE（轮询 60s，延迟最长约 1 分钟）/ 连接失败原因 |

密码字段声明为 `role('secret')`，由 credential provider 保存，不落 `settings` 明文。

## 关键约束

- 不处理附件，只取 `text/plain`（缺失时用 HTML 降级）
- 不设发送频率或发送量限制
- 拦截 `Auto-Submitted`（非 `no`）与 `Precedence: bulk/junk/list`，防邮件环
- UID 游标持久化；首次配置建立基线，不回放历史邮件
- 断线重连退避：5s → 10s → 30s → 1min → 5min
- SMTP 单例连接池（`pool: true`，`maxConnections: 3`）

## 包结构

```
src/
├── index.ts      # name / inject / Config / apply
├── config.ts     # schemastery（volatile + secret 密码）
├── policy.ts     # AccessPolicy 纯函数、toJob 一次解析
├── mailbox.ts    # 绑定信息规范化与连接键
├── cursor.ts     # UID 游标持久化
├── receiver.ts   # ImapReceiver：IDLE/轮询、能力探测、退避
├── sender.ts     # SmtpSender：连接池回信
├── deliver.ts    # ctx.agents 与 session/event 的唯一适配点
├── gateway.ts    # 编排、串行队列、reload
├── service.ts    # Typert Remote（get/save/test/status）
├── remote.ts     # Remote 契约与类型声明
├── typert.ts     # source-mode 发现占位
└── client/       # settings.section UI
```

客户端入口为 `./client`，由 esbuild 打包为单文件；宿主入口为 `./index.js`。
