import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { MailJob } from './types.js'

interface DriveHandle {
  agent: Agent
  /** 该 Agent 作用域内的 durable 事件订阅。 */
  off: () => void
  dispose(): Promise<void>
}

/**
 * 邮件会话适配层：ctx.agents / session/event 的全部调用都收在这里，
 * Agent API 变化时只需改这一个文件。
 */
export class MailDeliverer {
  private readonly handles = new Map<string, DriveHandle>()
  private readonly turnBuffers = new Map<string, string[]>()
  /** 每个会话按投递顺序排队，一轮回复对应队首的一封来信。 */
  private readonly pending = new Map<string, MailJob[]>()
  /** 每个会话已处理的最大事件序号，用于根/Agent 两处订阅的去重。 */
  private readonly seen = new Map<string, number>()
  private readonly offRoot: () => void

  constructor(
    private readonly ctx: Context,
    private readonly onReply: (job: MailJob, text: string) => Promise<void>,
    private readonly onLog?: (message: string) => void,
  ) {
    // 根上下文与 Agent 上下文同时订阅：不同版本的事件派发可能只覆盖其中一个
    // 作用域，两处都挂可保证收到；重复事件用 seq 去重。
    this.offRoot = ctx.on('session/event', (session, event) => {
      this.handleEvent(session, event)
    })
  }

  async deliver(job: MailJob): Promise<void> {
    const handle = await this.ensure(job.sessionId)
    const queue = this.pending.get(job.sessionId) ?? []
    queue.push(job)
    this.pending.set(job.sessionId, queue)
    handle.agent.followup(
      createUserMessage({
        content: [{ type: 'text', text: job.text }],
        source: { kind: 'user' },
      }),
    )
    this.onLog?.(`[mail] ${job.sessionId} 已交给模型，等待回复`)
  }

  dispose(): void {
    this.offRoot()
    for (const handle of this.handles.values()) {
      handle.off()
      void handle.dispose().catch(() => {})
    }
    this.handles.clear()
    this.turnBuffers.clear()
    this.pending.clear()
    this.seen.clear()
  }

  private async ensure(sessionId: string): Promise<DriveHandle> {
    const cached = this.handles.get(sessionId)
    if (cached) return cached

    const id = sessionId as SessionId
    const live = this.ctx.agents.get(id)
    if (live) {
      if (this.ctx.sessions.get(id) !== live.session) {
        throw new Error(`会话 ${sessionId} 未进入全局 SessionStore`)
      }
      const borrowed: DriveHandle = {
        agent: live,
        off: this.watch(live),
        dispose: async () => {},
      }
      this.handles.set(sessionId, borrowed)
      return borrowed
    }

    let handle: AgentHandle
    let created = false
    try {
      handle = await this.ctx.agents.resume({ resumeSessionId: id })
    } catch {
      // 与 ACP 的外部会话创建路径一致：cwd 是持久会话的工作区元数据。
      handle = await this.ctx.agents.create({
        sessionId: id,
        meta: { cwd: process.cwd() },
      })
      created = true
    }
    this.onLog?.(`[mail] ${sessionId} 会话已${created ? '创建' : '恢复'}`)

    // DeepSeek 请求扩展通过全局 SessionStore 上传 dsh_session_log。若这里不可见，
    // 继续 followup 只会让服务端按 sessionId 加载一份不存在的历史。
    if (this.ctx.sessions.get(id) !== handle.agent.session) {
      await handle.dispose()
      throw new Error(`会话 ${sessionId} 创建后未进入全局 SessionStore`)
    }

    const owned: DriveHandle = {
      agent: handle.agent,
      off: this.watch(handle.agent),
      dispose: () => handle.dispose(),
    }
    this.handles.set(sessionId, owned)
    return owned
  }

  /**
   * 在 Agent 作用域内订阅会话事件。作用域过滤下，只有进入该 Agent 上下文的监听
   * 才能稳定收到本会话的 durable 事件，因此不能挂在插件根上下文上。
   */
  private watch(agent: Agent): () => void {
    return agent.ctx.on('session/event', (session, event) => {
      this.handleEvent(session, event)
    })
  }

  private handleEvent(session: Session, event: SessionEvent): void {
    const sessionId = session.header.id as string
    if (!sessionId.startsWith('mail:') || !this.handles.has(sessionId)) return
    const lastSeq = this.seen.get(sessionId) ?? 0
    if (event.seq <= lastSeq) return
    this.seen.set(sessionId, event.seq)
    if (event.type === 'assistant/message') {
      const text = event.data.message.content
        .filter(block => block.type === 'text')
        .map(block => (block.type === 'text' ? block.text : ''))
        .join('')
      if (!text) return
      const key = `${sessionId}:${event.data.turn}`
      this.turnBuffers.set(key, [...(this.turnBuffers.get(key) ?? []), text])
      return
    }

    if (event.type === 'turn/end') {
      const key = `${sessionId}:${event.data.turn}`
      const text = (this.turnBuffers.get(key) ?? []).join('\n\n').trim()
      this.turnBuffers.delete(key)

      // 无论本轮成败都出队一封，保持“一封信对应一轮”的 FIFO 对齐。
      const queue = this.pending.get(sessionId)
      const job = queue?.shift()
      if (queue && queue.length === 0) this.pending.delete(sessionId)
      if (!job) return

      if (event.data.reason.kind !== 'completed' || !text) {
        this.onLog?.(`[mail] ${sessionId} 本轮未产生可回复文本（${event.data.reason.kind}）`)
        return
      }
      this.onLog?.(`[mail] ${sessionId} 模型已回复，准备回信 ${job.from}`)
      void this.onReply(job, text).catch(error => {
        this.onLog?.(`[mail] 回信失败: ${error instanceof Error ? error.message : String(error)}`)
      })
    }
  }
}
