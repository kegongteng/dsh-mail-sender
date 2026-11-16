import type { Context } from '@deepseek-ai/cordis';
import type { MailJob } from './types.js';
/**
 * 邮件会话适配层：ctx.agents / session/event 的全部调用都收在这里，
 * Agent API 变化时只需改这一个文件。
 */
export declare class MailDeliverer {
    private readonly ctx;
    private readonly onReply;
    private readonly onLog?;
    private readonly handles;
    private readonly turnBuffers;
    /** 每个会话按投递顺序排队，一轮回复对应队首的一封来信。 */
    private readonly pending;
    constructor(ctx: Context, onReply: (job: MailJob, text: string) => Promise<void>, onLog?: ((message: string) => void) | undefined);
    deliver(job: MailJob): Promise<void>;
    dispose(): void;
    private ensure;
    /**
     * 在 Agent 作用域内订阅会话事件。作用域过滤下，只有进入该 Agent 上下文的监听
     * 才能稳定收到本会话的 durable 事件，因此不能挂在插件根上下文上。
     */
    private watch;
    private handleEvent;
}
