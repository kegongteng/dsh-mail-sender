# DSH 邮件网关插件 — 完整开发计划

插件形态：**函数形态常驻入口**（`export const name / inject / Config` + `export function apply`，无 default export）。核心链路沿用已确认的模块划分，本计划把 **UI 配置页**作为第一优先级展开，服务商适配收敛为“探测 IDLE → 提示 → 不支持则轮询”，代码中不出现服务商名。

---

## 一、模块清单

```
src/
├── index.ts           # 入口：name / inject / Config / apply + RPC 注册
├── gateway.ts         # MailGateway：唯一持有 ctx 的编排层，转发状态
├── receiver.ts        # ImapReceiver：能力探测、IDLE/轮询、游标、重连
├── sender.ts          # SmtpSender：transporter 池、线程头
├── policy.ts          # AccessPolicy：纯函数，白名单 + 防环
├── deliver.ts         # 唯一触碰 ctx.agents 的地方
└── client/
    ├── index.ts       # client 入口：注册 settings.section
    └── MailGatewaySection.tsx  # 配置页主体
```

`receiver` 只产出 `MailJob | null` 和状态；`sender` 只接收 `ReplyMessage`；`policy` 无 IO；`deliver` 是 `ctx.agents` 的唯一适配点。`MailGateway` 是唯一同时持有四者并做编排的地方，也是状态的唯一出口。

---

## 二、UI 配置页（本计划重点）

### 2.1 注册方式

DSH ≥ 0.1.6-alpha.2 起，插件配置从设置页迁到侧边栏「插件」页，`settings.plugin.item` 已退役。走 **`settings.section` 槽位**，与「通用设置」平级：

```ts
// client/index.ts
export function apply(ctx: ClientContext) {
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'mail-gateway', order: 50, label: '邮件网关' },
    MailGatewaySection,
  ))
}
```

约束（来自 DSH 侧边栏规范）：

- `id` 必填，`label` 直接作为可见文字；**图标由外壳按 `id` 查表，未知 id 回退齿轮图标**，插件无法自定义图标。
- 内容区宽度约 **559px**（800 − 188 左栏 − 48 padding − 滚动条）。
- 根节点**不要**写 `height: 100%` 或 `overflow-y: auto`，滚动由外壳负责。

### 2.2 页面分区（自上而下）

```
┌──────────────────────────────────────────────┐
│  ① 连接状态卡片（只读）                        │
│     ● 已连接 · 支持实时推送（IDLE）            │
│     或 ● 已连接 · 服务器不支持 IDLE，轮询 60s  │
│     或 ○ 正在连接…  /  ✕ 连接失败：原因         │
├──────────────────────────────────────────────┤
│  ② 邮箱绑定表格（IMAP 收信 / SMTP 发信）        │
│     ┌──────────┬──────────────┬─────────┐    │
│     │ 字段      │ 输入          │ 说明     │    │
│     ├──────────┼──────────────┼─────────┤    │
│     │ IMAP 主机 │ [__________] │ SSL 993 │    │
│     │ ...      │              │         │    │
│     └──────────┴──────────────┴─────────┘    │
│     [ 测试连接 ]  [ 保存 ]                    │
├──────────────────────────────────────────────┤
│  ③ 白名单表格（可增删）                        │
│     ┌────────────────────┬──────┐            │
│     │ 发件地址            │ 操作  │            │
│     ├────────────────────┼──────┤            │
│     │ alice@corp.com     │ 删除  │            │
│     │ bob@partner.io     │ 删除  │            │
│     └────────────────────┴──────┘            │
│     [ 输入地址回车添加________________ ]       │
│     [ 保存白名单 ]                            │
└──────────────────────────────────────────────┘
```

### 2.3 ① 连接状态卡片

只读展示，数据来自 `mail-gateway.status` RPC。四种状态对应四种文案与颜色：

| 状态 | 文案 | 视觉 |
| :--- | :--- | :--- |
| `connecting` | 正在连接… | 灰点，脉冲动画 |
| `connected` + `idle: true` | 已连接 · 支持实时推送（IDLE） | 绿点 |
| `connected` + `idle: false` | 已连接 · 服务器不支持 IDLE，使用 60 秒轮询，收信延迟最长约 1 分钟 | 黄点 + 说明 |
| `error` | 连接失败：{message} | 红点 |

这张卡片是用户判断“为什么收信慢”的唯一入口，`idle: false` 的说明文字必须完整，不能只写“不支持 IDLE”。卡片在页面加载时拉一次状态，并在 `test` / `save` 成功后刷新。

### 2.4 ② 邮箱绑定表格

用真正的 `<table>` 布局，每行一个字段，三列：**字段名 / 输入控件 / 说明**。说明列固定文案，不随输入变化。

**IMAP 收信**

| 字段 | 控件 | 说明 |
| :--- | :--- | :--- |
| IMAP 主机 | text | 如 `imap.larksuite.com` |
| 端口 | number，默认 993 | SSL 通常 993 |
| SSL | checkbox，默认勾选 | |
| 用户名 | text | 完整邮箱地址 |
| 密码 / 授权码 | password | 保存后只回显“已设置” |

**SMTP 发信**

| 字段 | 控件 | 说明 |
| :--- | :--- | :--- |
| SMTP 主机 | text | 如 `imap.larksuite.com` |
| 端口 | number，默认 465 | SSL 通常 465 |
| SSL | checkbox，默认勾选 | |
| 发件人显示名 | text，默认 `DSH Assistant` | 回信 `From` 的显示名 |

密码字段：读接口返回 `{ set: true }` 而非明文，输入框 `placeholder` 显示“已设置，留空则不修改”；用户输入新值才覆盖，留空则保留原密码。这是 UI 的标准做法，不是防御性编程。

**两个按钮**

- **测试连接**：调 `mail-gateway.test`，后端用当前表单值临时建一次 IMAP 连接、登录、`capability()`，返回 `{ ok, idle, error }`。结果直接写进 ① 状态卡片，用户填完配置**立刻**知道是否支持 IDLE，不必等保存后被动刷新。这是本页最重要的交互——IDLE 支持情况在用户决策点上就可见。
- **保存**：调 `mail-gateway.save`，写回 `ctx.settings`，触发 `settings/updated` → `gateway.reload`。保存成功后刷新 ① 状态卡片。

### 2.5 ③ 白名单表格

两列表格：**发件地址 / 操作**。每行末尾一个删除按钮。表格下方一个输入框 + “添加”按钮，回车或点击添加即插入一行（本地状态，未提交）。底部“保存白名单”按钮调 `mail-gateway.save-whitelist`，`policy.update` 立即生效，**不断开 IMAP 连接**。

地址校验只做一项：`normalize` 后非空即接受（`normalize` 与后端 `AccessPolicy` 共用同一函数，保证两侧匹配语义一致）。不写邮箱正则——后端精确匹配，正则只会制造前后端不一致。空列表允许保存，此时 ① 卡片下方追加一行提示：“白名单为空，不会接收任何邮件”。

### 2.6 组件树

```
MailGatewaySection
├── StatusCard              # 读 status，纯展示
├── MailboxFormTable        # 受控表单，本地 state
│   ├── ImapFields
│   ├── SmtpFields
│   └── FormActions         # 测试连接 / 保存
└── WhitelistTable
    ├── AddressRow[]        # 地址 + 删除
    └── AddAddressInput     # 输入 + 添加
```

`StatusCard` 只接收 props，不发请求；数据由 `MailGatewaySection` 统一拉取和刷新，避免每个子组件各自轮询。

### 2.7 RPC 契约

| RPC | 入参 | 返回 |
| :--- | :--- | :--- |
| `mail-gateway.get` | — | `{ mailbox: MaskedMailbox, whitelist: string[], reply: {...} }` |
| `mail-gateway.save` | `MailboxInput` | `{ ok: true }` |
| `mail-gateway.test` | `MailboxInput` | `{ ok: boolean, idle?: boolean, error?: string }` |
| `mail-gateway.save-whitelist` | `string[]` | `{ ok: true }` |
| `mail-gateway.status` | — | `ReceiverStatus` |

`MailboxInput` 中 `password` 为 `string | undefined`，`undefined` 表示“不修改”。`test` 用临时连接，不触碰正在运行的 `ImapReceiver`，测试完 `logout`。

---

## 三、状态模型

```ts
export type ReceiverStatus =
  | { state: 'connecting' }
  | { state: 'connected'; idle: boolean; since: number }
  | { state: 'error'; message: string }
```

`ImapReceiver` 在 `connect()` 登录完成后写入 `connected`，重连退避期间写 `error`，`reload` 重建时写 `connecting`。`MailGateway.getStatus()` 直接转发，RPC 读它。状态只此一处产生，`test` RPC 的结果是独立返回值，不写回 `receiver`——测试的是表单值，不是运行中的连接。

---

## 四、后端要点（承接已确认设计）

**能力探测与分支**（`receiver.ts`）：

```ts
await this.client.connect()            // 含登录
const caps = await this.client.capability()
const idle = caps.has('IDLE')
this.status = { state: 'connected', idle, since: Date.now() }

if (idle) {
  this.client.on('exists', () => this.fetchNew())
  this.idleTimer = setInterval(() => this.client?.exec('NOOP').catch(() => {}), 29 * 60 * 1000)
} else {
  this.pollTimer = setInterval(() => this.fetchNew(), 60_000)
}
```

必须在**认证之后**探测，覆盖 iCloud 这类登录后才公告 IDLE 的服务器。分支只取决于 `caps.has('IDLE')`，不出现服务商名。

**准入与提取**（`toJob`）：白名单不通过或 `Auto-Submitted` / `Precedence` 命中则返回 `null`，静默丢弃。`fetching` 守卫防轮询重入。UID 游标持久化，首次配置建基线不回放历史。

**会话**（`deliver.ts`）：`sessionId = mail:${normalize(from)}` 是纯函数；`get` → 不存在则探测 → `resume` 或 `create`；`followup(text)` 投递；监听 `session/event` 的 `assistant/message` durable 事件取回复，不订阅流。

**发送**（`sender.ts`）：单例 transporter + `pool: true`，`maxConnections: 3`，`maxMessages: 50`；`In-Reply-To` / `References` 保证线程归并；出站不做白名单二次校验。

**编排**（`gateway.ts`）：`drain` 串行消费带必要 `try/catch`；`reload(next)` 不接 `ctx`，白名单变更只 `policy.update`，`mailbox` 变更才重连；`stop()` 依次 `receiver.stop()` → `sender.close()`。

---

## 五、实施顺序

| 阶段 | 内容 | 验证点 |
| :--- | :--- | :--- |
| 1 | 入口 + Config + `ctx.effect` 清理骨架 | Fiber 进入 ACTIVE，卸载无残留 |
| 2 | `AccessPolicy` 单测 | 精确命中、自动流量拦截、`normalize` 前后端一致 |
| 3 | `ImapReceiver` + 认证后探测 + 轮询回退 + 状态写入 | Zoho 显示 `idle: true`；Lark 显示 `idle: false` 且 60s 内收到新邮件 |
| 4 | `SmtpSender` + 连接池 + 线程头 | 回信归入原线程，池连接复用 |
| 5 | `deliver` + `MailGateway` 编排 + 五个 RPC | 同地址续接会话，重启 `resume` 不 `create` |
| 6 | **UI：`settings.section` 注册 + 三张卡片/表格 + 测试连接** | 填表 → 测试连接 → 状态卡显示 IDLE 结果；白名单增删保存不断连 |
| 7 | 热重载与并发边界 | 改白名单不断连、多封信不丢推送、测试连接不影响运行中连接 |

阶段 6 依赖 5 的 RPC 就绪，但**UI 的静态布局（三张卡片、两张表格的 DOM 结构与样式）可以在阶段 1 之后并行开发**，用 mock 数据填充，RPC 就绪后替换数据源。`test` RPC 与 `status` RPC 的返回结构在阶段 5 与前端对齐一次即可，避免 UI 联调时反复改契约。

---

## 六、明确不做的

- **不按服务商名硬编码分支**：只认 `caps.has('IDLE')`。
- **不做发送频率限制**：按需求，没有发送墙。
- **不处理附件**：`toJob` 只取 `text/plain`，HTML 降级，附件丢弃。
- **不做白名单正则校验**：精确地址匹配，前端只做 `normalize` 非空校验。
- **不在 UI 里重复轮询**：状态由 `MailGatewaySection` 统一拉取，`StatusCard` 纯展示。