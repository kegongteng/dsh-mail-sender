import { createPolicy } from './policy.js';
import { ImapReceiver, POLL_INTERVAL_MS } from './receiver.js';
import { CursorStore } from './cursor.js';
import { MailDeliverer } from './deliver.js';
import { SmtpSender } from './sender.js';
import { isMailboxConfigured, mailboxKey, publicMailbox } from './mailbox.js';
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * 常驻邮件的编排层：收信 → 串行队列 → 会话 → 回信。
 * 白名单保存只更新内存策略，邮箱绑定变化才重连。
 */
export class MailGateway {
    onLog;
    receiver;
    sender;
    deliverer;
    queue = [];
    draining = false;
    mailbox;
    policy;
    allowed;
    accountKey = '';
    generation = 0;
    logs = [];
    status = {
        phase: 'disabled',
        supportsIdle: false,
        pollIntervalMs: POLL_INTERVAL_MS,
    };
    constructor(ctx, mailbox, allowed, onLog = message => console.warn(message)) {
        this.onLog = onLog;
        this.mailbox = mailbox;
        this.allowed = [...allowed];
        this.policy = createPolicy(allowed);
        this.deliverer = new MailDeliverer(ctx, async (job, text) => {
            if (!this.sender)
                throw new Error('SMTP 尚未配置');
            await this.sender.send(job, text);
            this.record(`[mail] 已回信 ${job.from}`);
        }, message => this.record(message));
    }
    /** 所有运行日志都进内存环形缓冲，设置页可直接查看，同时保留控制台输出。 */
    record(message) {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        this.logs.push(`${time} ${message}`);
        if (this.logs.length > 200)
            this.logs.splice(0, this.logs.length - 200);
        this.onLog(message);
    }
    start() {
        this.restart();
        return async () => {
            this.deliverer.dispose();
            await this.receiver?.stop();
            this.receiver = undefined;
            this.sender?.close();
            this.sender = undefined;
        };
    }
    /** 只接受新的绑定与白名单；ctx 不参与重载。 */
    reload(mailbox, allowed) {
        const nextKey = mailboxKey(mailbox);
        this.allowed = [...allowed];
        this.policy = createPolicy(allowed);
        if (nextKey !== this.accountKey) {
            this.mailbox = mailbox;
            this.restart();
            return;
        }
        this.mailbox = mailbox;
        this.sender?.update(mailbox);
    }
    updatePolicy(allowed) {
        this.allowed = [...allowed];
        this.policy = createPolicy(allowed);
    }
    snapshot() {
        return {
            mailbox: publicMailbox(this.mailbox),
            passwordSet: Boolean(this.mailbox.password),
            allowedAddresses: [...this.allowed],
            status: this.status,
            logs: [...this.logs],
        };
    }
    restart() {
        const generation = ++this.generation;
        void this.receiver?.stop();
        this.receiver = undefined;
        this.sender?.close();
        this.sender = undefined;
        if (!isMailboxConfigured(this.mailbox)) {
            this.accountKey = '';
            this.status = { phase: 'disabled', supportsIdle: false, pollIntervalMs: POLL_INTERVAL_MS };
            this.record('[mail] 未配置完整邮箱，收信入口保持关闭');
            return;
        }
        this.record(`[mail] 开始连接 ${this.mailbox.imapHost}:${this.mailbox.imapPort}`);
        this.accountKey = mailboxKey(this.mailbox);
        this.sender = new SmtpSender(this.mailbox);
        this.receiver = new ImapReceiver(this.mailbox, () => this.policy, new CursorStore(`${this.mailbox.email}@${this.mailbox.imapHost}`), {
            onJob: job => this.enqueue(job),
            onStatus: status => {
                if (generation === this.generation)
                    this.status = status;
            },
            onLog: message => this.record(message),
        });
        this.receiver.start();
    }
    enqueue(job) {
        this.queue.push(job);
        void this.drain();
    }
    /** 串行消费；单封失败只记录，不拖垮常驻循环。 */
    async drain() {
        if (this.draining)
            return;
        this.draining = true;
        try {
            while (this.queue.length) {
                const job = this.queue.shift();
                try {
                    await this.deliverer.deliver(job);
                }
                catch (error) {
                    this.record(`[mail] 投递 ${job.from} 失败: ${errorMessage(error)}`);
                }
            }
        }
        finally {
            this.draining = false;
        }
    }
}
