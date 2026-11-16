import type { Context } from '@deepseek-ai/cordis';
import type { MailSnapshot, MailboxSettings } from './types.js';
/**
 * 常驻邮件的编排层：收信 → 串行队列 → 会话 → 回信。
 * 白名单保存只更新内存策略，邮箱绑定变化才重连。
 */
export declare class MailGateway {
    private readonly onLog;
    private receiver?;
    private sender?;
    private readonly deliverer;
    private readonly queue;
    private draining;
    private mailbox;
    private policy;
    private allowed;
    private accountKey;
    private generation;
    private status;
    constructor(ctx: Context, mailbox: MailboxSettings, allowed: readonly string[], onLog?: (message: string) => void);
    start(): () => Promise<void>;
    /** 只接受新的绑定与白名单；ctx 不参与重载。 */
    reload(mailbox: MailboxSettings, allowed: readonly string[]): void;
    updatePolicy(allowed: readonly string[]): void;
    snapshot(): MailSnapshot;
    private restart;
    private enqueue;
    /** 串行消费；单封失败只记录，不拖垮常驻循环。 */
    private drain;
}
