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
    /** 每个会话已处理的最大事件序号，用于根/Agent 两处订阅的去重。 */
    seen = new Map();
    offRoot;
    constructor(ctx, onReply, onLog) {
        this.ctx = ctx;
        this.onReply = onReply;
        this.onLog = onLog;
        // 根上下文与 Agent 上下文同时订阅：不同版本的事件派发可能只覆盖其中一个
        // 作用域，两处都挂可保证收到；重复事件用 seq 去重。
        this.offRoot = ctx.on('session/event', (session, event) => {
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
        this.offRoot();
        for (const handle of this.handles.values()) {
            handle.off();
            void handle.dispose().catch(() => { });
        }
        this.handles.clear();
        this.turnBuffers.clear();
        this.pending.clear();
        this.seen.clear();
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
                off: this.watch(live),
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
            off: this.watch(handle.agent),
            dispose: () => handle.dispose(),
        };
        this.handles.set(sessionId, owned);
        return owned;
    }
    /**
     * 在 Agent 作用域内订阅会话事件。作用域过滤下，只有进入该 Agent 上下文的监听
     * 才能稳定收到本会话的 durable 事件，因此不能挂在插件根上下文上。
     */
    watch(agent) {
        return agent.ctx.on('session/event', (session, event) => {
            this.handleEvent(session, event);
        });
    }
    handleEvent(session, event) {
        const sessionId = session.header.id;
        if (!sessionId.startsWith('mail:') || !this.handles.has(sessionId))
            return;
        const lastSeq = this.seen.get(sessionId) ?? 0;
        if (event.seq <= lastSeq)
            return;
        this.seen.set(sessionId, event.seq);
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
