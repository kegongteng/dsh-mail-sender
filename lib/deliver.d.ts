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
    private readonly off;
    constructor(ctx: Context, onReply: (job: MailJob, text: string) => Promise<void>, onLog?: ((message: string) => void) | undefined);
    deliver(job: MailJob): Promise<void>;
    dispose(): void;
    private ensure;
    private handleEvent;
}
