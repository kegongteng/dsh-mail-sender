# dsh-mail-sender

DeepSeek Harness (DSH) 邮件通道插件：用户发邮件 → DSH 接收并交给 agent → agent 的回复自动用邮件发回去。

- **入站**：IMAP IDLE 实时监听收件箱
- **会话**：同一发件人 → 同一个 agent 会话（`sessionId = mail-<地址>`）
- **出站**：订阅 `session/event`，一轮 turn 正常结束后自动 SMTP 回信（`Re:` 主题 + `In-Reply-To`）
- **白名单**：`allowedAddresses` 同时控制入站与出站
- **配置界面**：Host 从导出的 `Config` schema 自动渲染，无需自写前端

## 工作原理

```
来信 (IMAP)
   │  mailparser 解析 from / subject / body / messageId
   ▼
白名单过滤 ── 不在 allowedAddresses → 丢弃
   │
   ▼
ctx.agents.create / resume (sessionId = `mail-${from}`)
   │  agent.followup(createUserMessage(...))
   ▼
订阅 session/event
   │  assistant/message → 累积 text 块
   │  turn/end (reason.kind === 'completed') → 取出本轮文本
   ▼
SMTP 回复 (Re: 原主题, In-Reply-To: 原 Message-ID)
```

## 安装

```bash
dsh plugin --profile web add dsh-mail-sender
```

安装后重启 `dsh web`，用 `dsh --profile web --dump-config` 确认插件行已进入配置树。

## 在设置页填写配置

打开 **Settings（设置）→ Plugins（插件）→ dsh-mail-sender**，表单由 Host 根据插件导出的 `Config` schema 自动生成。

> 该表单依赖两点，本插件已满足：
> 1. patch 行 `id` 与包名一致（`dsh-mail-sender`），设置表单按行 id 定位；
> 2. 每个可编辑字段声明为 `.volatile()`，DSH 才会把它投影成可编辑项并把改动写回 profile 的 `cordis.patch.yml`。

| 字段 | 说明 |
|---|---|
| `email` | 机器人邮箱，如 `agent@qq.com`（同时用于 IMAP/SMTP 登录与回信 From） |
| `password` | 邮箱密码或授权码 |
| `imapHost` | IMAP 服务器，如 `imap.qq.com`（固定 993 + SSL） |
| `smtpHost` | SMTP 服务器，如 `smtp.qq.com` |
| `smtpPort` | 默认 `465`（SSL）；填 `587` 时自动走 STARTTLS |
| `allowedAddresses` | 允许与 agent 通信的邮箱地址列表 |

服务器地址按你的邮箱服务商填写，插件不做猜测。

白名单同时控制两个方向：非名单内发件人的来信直接丢弃；agent 的回复目标就是来信人，因此也天然限定在名单内。

所有字段都是 `.volatile()`：保存后即时生效，IMAP 会按新配置自动重连，无需重启 host。

## 包结构

```
.
├── package.json        # dsh.bundle 声明（无 dsh.client，纯 Host 插件）
├── cordis.patch.yml    # 顶层 YAML 数组：插入插件行
├── src/index.ts
├── tsconfig.json
└── .npmrc              # legacy-peer-deps=true（本地开发）
```

`cordis.patch.yml` 必须是**顶层数组**的 loader patch 条目：

```yaml
- insert:
    - id: dsh-mail-sender
      name: dsh-mail-sender
```