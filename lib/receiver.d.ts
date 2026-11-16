import type { AccessPolicy } from './policy.js';
import type { CursorStore } from './cursor.js';
import type { MailJob, MailStatus, MailboxSettings } from './types.js';
/** 不支持的服务器按 60s 轮询，延迟上限约 1 分钟。 */
export declare const POLL_INTERVAL_MS = 60000;
/** 断线重连退避：5s → 10s → 30s → 1min → 5min。 */
export declare const BACKOFF_MS: readonly [5000, 10000, 30000, 60000, 300000];
export interface ReceiverHooks {
    onJob(job: MailJob): void;
    onStatus(status: MailStatus): void;
    onLog?(message: string): void;
}
/** 用临时连接探测 IDLE 能力；登录完成后才读取能力表。 */
export declare function probeIdle(mailbox: MailboxSettings): Promise<boolean>;
export declare class ImapReceiver {
    private readonly mailbox;
    private readonly policy;
    private readonly cursors;
    private readonly hooks;
    private running;
    private client?;
    private wakeSleep?;
    private fetching;
    private cursor;
    private uidValidity;
    private status;
    constructor(mailbox: MailboxSettings, policy: () => AccessPolicy, cursors: CursorStore, hooks: ReceiverHooks);
    get currentStatus(): MailStatus;
    start(): void;
    stop(): Promise<void>;
    private report;
    private run;
    /** 首次配置或 UIDVALIDITY 变化时建立基线，不回放历史邮件。 */
    private prime;
    private collect;
    private sleep;
    private wake;
}
