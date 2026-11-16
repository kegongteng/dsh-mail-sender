# dsh-mail-sender 收尾规格

## 1. 目标

在 `f:\git\dsh-mail-sender` 交付 DSH 邮件通道插件：标准 IMAP/SMTP 常驻入口，邮件驱动 agent 会话，回复自动回信。实现范围以 [guide.md](file:///f:/git/dsh-mail-sender/guide.md) 的 F1–F9、U1–U7、T1–T20 与“边界与不做的事”为准。

## 2. 当前状态

插件代码已完整实现，文件与职责：

| 文件 | 职责 |
|---|---|
| `src/index.ts` | `name / inject / Config / apply`，无 default export；资源收进 `ctx.effect` |
| `src/config.ts` | schemastery 配置，`mailbox` / `allowedAddresses` 为 volatile，密码 `role('secret')` |
| `src/policy.ts` | `AccessPolicy` 纯函数、`toJob` 一次解析、防环、正文提取 |
| `src/mailbox.ts` | 绑定规范化、`mailboxKey`、`publicMailbox`、发件人头 |
| `src/cursor.ts` | UID 游标持久化（`~/.dsh/mail-gateway/<sha1>.json`） |
| `src/receiver.ts` | `ImapReceiver`、`probeIdle`、IDLE/60s 轮询、指数退避 |
| `src/sender.ts` | `SmtpSender` 单例连接池，`In-Reply-To` / `References` |
| `src/deliver.ts` | `ctx.agents` 与 `session/event` 唯一适配点 |
| `src/gateway.ts` | 编排、串行 `drain`、`reload`、`updatePolicy` |
| `src/service.ts` | Typert Remote：`get / status / saveMailbox / saveWhitelist / testConnection` |
| `src/remote.ts` | 手写 Remote 契约与 `TypertRemote*` 模块增强 |
| `src/client/` | `settings.section` UI：状态卡、三列表单、白名单表格 |

## 3. 已静态确认的契约（未运行任何命令）

- `RemoteError` 支持 `gateway/bad-request`、`gateway/internal`，构造签名 `(code, message, details)`。
- `TypertRemoteService(ctx, serviceKey, { namespace })`、`@Remote(name)`、`createTypertRemoteInfo(spec, zod)` 与 `src/remote.ts` 的 spec 形状一致。
- `assistant/message.data` 含 `turn` / `message`；`turn/end.data` 含 `turn` / `reason`，`reason.kind` 含 `completed`。
- `ctx.agents.get(id)`、`create({ sessionId })`、`resume({ resumeSessionId })`、`AgentHandle{agent,dispose}`、`followup(UserMessage)` 与调用一致。
- 源码不存在已移除依赖（`react-dom`、`@deepseek-ai/dsh-api-remote-access`）的引用。

## 4. 待修复缺陷（唯一代码改动）

**文件**：`src/deliver.ts`

**问题**：`jobs: Map<string, MailJob>` 每个会话只保留最新一封；`pending: Set<string>` 无法表达“一封信对应一轮”。同一发件人连发两封且第一轮未结束时：

1. 第一轮 `turn/end` 用第二封的 `messageId` / 主题回信，线程归并错乱；
2. `pending` 被删除，第二轮结束时不再回信，第二封永久丢失回复。

**改法（决策已定）**：

- 将 `pending: Set<string>` + `jobs: Map<string, MailJob>` 合并为 `pending: Map<string, MailJob[]>`。
- `deliver(job)`：`ensure()` 后把 job 推入该会话队列，再 `followup`。
- `handleEvent` 的 `turn/end` 分支：
  - 始终取出该会话队列头部一封（`shift`），队列空则删除键；
  - 仅当 `reason.kind === 'completed'` 且本轮累积文本非空时才 `onReply(job, text)`；
  - 非 completed 也出队，避免失败轮次与后续邮件错位。
- `assistant/message` 累积逻辑与 `turnBuffers` 保持不变。
- `dispose()` 对 Map 执行 `clear()`。

**验收**：连发两封邮件时，两轮各回一封信，主题与 `In-Reply-To` 分别对应各自来信；失败轮次不产生回复且不吞掉下一封。

## 5. 明确不做

- 不执行 `npm install`、`npm run build`、任何 dsh 相关命令（本机无 dsh，用户明确要求）。
- 不修改 `guide.md`、`package.json` 依赖集合、`cordis.patch.yml`。
- 不发送频率限制、不处理附件、不做白名单正则校验、不自定义图标、UI 不重复轮询。

## 6. 验证方式

仅静态验证：

1. 逐行复核 `src/deliver.ts` 修改后的类型与控制流（`Map<string, MailJob[]>`、`shift()` 后空队列删除、`completed` 判定）。
2. 全仓检索 `pending` / `jobs` 无残留引用。
3. 核对 `src/types.ts` 的 `MailJob` 与 `MailSnapshot` 未被改动。

## 7. 审批

确认本规格后按其执行 `tasks.md`；若不同意“失败轮次也出队”或 FIFO 映射方式，请先指出再改。
