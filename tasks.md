# 任务清单

## [x] T1 修复同会话多封邮件的回复映射

- 文件：`src/deliver.ts`
- `pending: Set<string>` 与 `jobs: Map<string, MailJob>` 合并为 `pending: Map<string, MailJob[]>`
- `deliver()`：`ensure()` 后 `queue.push(job)`，再 `followup`
- `turn/end`：始终从队首 `shift()` 一封（空队列则 `delete`），仅在 `reason.kind === 'completed'` 且文本非空时 `onReply`
- `dispose()`：`pending.clear()`
- 验证：已静态检查队列入队/出队/清理路径，`jobs` 引用已清零

## [x] T2 静态一致性复核

- 全仓检索 `pending`、`jobs`、`onReply`：仅 `deliver.ts` 使用，语义一致，无残留 `jobs`
- `src/types.ts`、`src/gateway.ts` 未改动

## [x] T3 约束确认

- 未执行 `npm install` / `npm run build` / 任何 dsh 命令
- 未改 `guide.md`、`package.json`、`cordis.patch.yml`
- 真实 DSH 宿主上仍需验证：客户端 Remote `$mount` 与 `settings.section` 渲染、`settings.mutate` 对嵌套 volatile / secret 字段的落地
