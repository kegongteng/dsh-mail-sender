import { createUserMessage } from '@deepseek-ai/dsh-llm';
/**
 * 邮件会话适配层：ctx.agents / session/event 的全部调用都收在这里，
 * Agent API 变化时只需改这一个文件。
 */
export class MailDeliverer {
    ctx;
    onReply;
    onLog;
    handles = new Map();
    turnBuffers = new Map();
    /** 每个会话按投递顺序排队，一轮回复对应队首的一封来信。 */
    pending = new Map();
    off;
    constructor(ctx, onReply, onLog) {
        this.ctx = ctx;
        this.onReply = onReply;
        this.onLog = onLog;
        this.off = ctx.on('session/event', (session, event) => {
            this.handleEvent(session, event);
        });
    }
    async deliver(job) {
        const handle = await this.ensure(job.sessionId);
        const queue = this.pending.get(job.sessionId) ?? [];
        queue.push(job);
        this.pending.set(job.sessionId, queue);
        handle.agent.followup(createUserMessage({
            content: [{ type: 'text', text: job.text }],
            source: { kind: 'user' },
        }));
    }
    dispose() {
        this.off();
        for (const handle of this.handles.values()) {
            if (handle.owned)
                void handle.dispose().catch(() => { });
        }
        this.handles.clear();
        this.turnBuffers.clear();
        this.pending.clear();
    }
    async ensure(sessionId) {
        const cached = this.handles.get(sessionId);
        if (cached)
            return cached;
        const id = sessionId;
        const live = this.ctx.agents.get(id);
        if (live) {
            const borrowed = {
                agent: live,
                owned: false,
                dispose: async () => { },
            };
            this.handles.set(sessionId, borrowed);
            return borrowed;
        }
        let handle;
        try {
            handle = await this.ctx.agents.resume({ resumeSessionId: id });
        }
        catch {
            handle = await this.ctx.agents.create({ sessionId: id });
        }
        const owned = {
            agent: handle.agent,
            owned: true,
            dispose: () => handle.dispose(),
        };
        this.handles.set(sessionId, owned);
        return owned;
    }
    handleEvent(session, event) {
        const sessionId = session.header.id;
        if (!sessionId.startsWith('mail:') || !this.handles.has(sessionId))
            return;
        if (event.type === 'assistant/message') {
            const text = event.data.message.content
                .filter(block => block.type === 'text')
                .map(block => (block.type === 'text' ? block.text : ''))
                .join('');
            if (!text)
                return;
            const key = `${sessionId}:${event.data.turn}`;
            this.turnBuffers.set(key, [...(this.turnBuffers.get(key) ?? []), text]);
            return;
        }
        if (event.type === 'turn/end') {
            const key = `${sessionId}:${event.data.turn}`;
            const text = (this.turnBuffers.get(key) ?? []).join('\n\n').trim();
            this.turnBuffers.delete(key);
            // 无论本轮成败都出队一封，保持“一封信对应一轮”的 FIFO 对齐。
            const queue = this.pending.get(sessionId);
            const job = queue?.shift();
            if (queue && queue.length === 0)
                this.pending.delete(sessionId);
            if (!job)
                return;
            if (event.data.reason.kind !== 'completed' || !text)
                return;
            void this.onReply(job, text).catch(error => {
                this.onLog?.(`[mail] 回信失败: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
    }
}
