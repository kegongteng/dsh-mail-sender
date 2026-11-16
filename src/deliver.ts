import type { Context } from '@deepseek-ai/cordis'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { MailJob } from './types.js'

interface DrivableAgent extends Agent {
  followup(message: unknown): void
}

interface DriveHandle {
  agent: DrivableAgent
  owned: boolean
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
  private readonly off: () => void

  constructor(
    private readonly ctx: Context,
    private readonly onReply: (job: MailJob, text: string) => Promise<void>,
    private readonly onLog?: (message: string) => void,
  ) {
    this.off = ctx.on('session/event', (session, event) => {
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
  }

  dispose(): void {
    this.off()
    for (const handle of this.handles.values()) {
      if (handle.owned) void handle.dispose().catch(() => {})
    }
    this.handles.clear()
    this.turnBuffers.clear()
    this.pending.clear()
  }

  private async ensure(sessionId: string): Promise<DriveHandle> {
    const cached = this.handles.get(sessionId)
    if (cached) return cached

    const id = sessionId as SessionId
    const live = this.ctx.agents.get(id)
    if (live) {
      const borrowed: DriveHandle = {
        agent: live as DrivableAgent,
        owned: false,
        dispose: async () => {},
      }
      this.handles.set(sessionId, borrowed)
      return borrowed
    }

    let handle: AgentHandle
    try {
      handle = await this.ctx.agents.resume({ resumeSessionId: id })
    } catch {
      handle = await this.ctx.agents.create({ sessionId: id })
    }

    const owned: DriveHandle = {
      agent: handle.agent as DrivableAgent,
      owned: true,
      dispose: () => handle.dispose(),
    }
    this.handles.set(sessionId, owned)
    return owned
  }

  private handleEvent(session: Session, event: SessionEvent): void {
    const sessionId = session.header.id as string
    if (!sessionId.startsWith('mail:') || !this.handles.has(sessionId)) return
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

      if (event.data.reason.kind !== 'completed' || !text) return
      void this.onReply(job, text).catch(error => {
        this.onLog?.(`[mail] 回信失败: ${error instanceof Error ? error.message : String(error)}`)
      })
    }
  }
}
