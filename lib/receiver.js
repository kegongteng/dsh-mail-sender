import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { toJob } from './policy.js';
/** 不支持的服务器按 60s 轮询，延迟上限约 1 分钟。 */
export const POLL_INTERVAL_MS = 60_000;
/** 断线重连退避：5s → 10s → 30s → 1min → 5min。 */
export const BACKOFF_MS = [5_000, 10_000, 30_000, 60_000, 300_000];
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
/** 用临时连接探测 IDLE 能力；登录完成后才读取能力表。 */
export async function probeIdle(mailbox) {
    const client = new ImapFlow({
        host: mailbox.imapHost,
        port: mailbox.imapPort,
        secure: mailbox.imapSecure,
        auth: { user: mailbox.username || mailbox.email, pass: mailbox.password },
        logger: false,
        disableAutoIdle: true,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });
    try {
        await client.connect();
        return client.capabilities.get('IDLE') === true;
    }
    finally {
        await client.logout().catch(() => { });
    }
}
export class ImapReceiver {
    mailbox;
    policy;
    cursors;
    hooks;
    running = false;
    client;
    wakeSleep;
    fetching = false;
    cursor = 0;
    uidValidity = '';
    status = {
        phase: 'disabled',
        supportsIdle: false,
        pollIntervalMs: POLL_INTERVAL_MS,
    };
    constructor(mailbox, policy, cursors, hooks) {
        this.mailbox = mailbox;
        this.policy = policy;
        this.cursors = cursors;
        this.hooks = hooks;
    }
    get currentStatus() {
        return this.status;
    }
    start() {
        if (this.running)
            return;
        this.running = true;
        void this.run();
    }
    async stop() {
        this.running = false;
        this.wake();
        const client = this.client;
        this.client = undefined;
        if (client)
            await client.logout().catch(() => { });
    }
    report(patch) {
        this.status = { ...this.status, ...patch };
        this.hooks.onStatus(this.status);
    }
    async run() {
        let attempt = 0;
        while (this.running) {
            this.report({ phase: 'connecting', lastError: undefined, since: undefined });
            const client = new ImapFlow({
                host: this.mailbox.imapHost,
                port: this.mailbox.imapPort,
                secure: this.mailbox.imapSecure,
                auth: { user: this.mailbox.username || this.mailbox.email, pass: this.mailbox.password },
                logger: false,
                disableAutoIdle: true,
                maxIdleTime: POLL_INTERVAL_MS,
            });
            this.client = client;
            let lock;
            try {
                await client.connect();
                if (!this.running || this.client !== client)
                    break;
                // 认证完成后再探测能力，覆盖 iCloud 一类仅在登录后公布 IDLE 的服务器。
                const supportsIdle = client.capabilities.get('IDLE') === true;
                lock = await client.getMailboxLock('INBOX');
                await this.prime(client);
                attempt = 0;
                this.report({
                    phase: supportsIdle ? 'idle' : 'polling',
                    supportsIdle,
                    lastError: undefined,
                    since: new Date().toISOString(),
                });
                // 先补收一次：IDLE 只对“之后到达”的邮件有响应，重启/重连期间到达的
                // 邮件（游标之后）必须主动拉取，否则会一直等到下一封新信才被处理。
                await this.collect(client);
                while (this.running && this.client === client) {
                    if (supportsIdle) {
                        const found = await client.idle();
                        if (!found && this.running)
                            await this.sleep(1_000);
                    }
                    else {
                        await this.sleep(POLL_INTERVAL_MS);
                    }
                    if (!this.running || this.client !== client)
                        break;
                    await this.collect(client);
                }
            }
            catch (error) {
                if (this.running) {
                    attempt = Math.min(attempt + 1, BACKOFF_MS.length);
                    this.report({
                        phase: 'error',
                        lastError: errorMessage(error),
                        since: undefined,
                    });
                    this.hooks.onLog?.(`[mail] IMAP 连接失败: ${errorMessage(error)}`);
                }
            }
            finally {
                try {
                    lock?.release();
                }
                catch { }
                if (this.client === client)
                    this.client = undefined;
                await client.logout().catch(() => { });
            }
            if (!this.running)
                break;
            const delay = BACKOFF_MS[Math.max(0, attempt - 1)] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
            await this.sleep(delay);
        }
        this.report({ phase: 'disabled', since: undefined });
    }
    /** 首次配置或 UIDVALIDITY 变化时建立基线，不回放历史邮件。 */
    async prime(client) {
        const mailbox = client.mailbox;
        if (!mailbox)
            return;
        const uidValidity = String(mailbox.uidValidity);
        const stored = await this.cursors.read();
        const cursor = stored && stored.uidValidity === uidValidity ? stored.uid : Math.max(0, mailbox.uidNext - 1);
        this.uidValidity = uidValidity;
        this.cursor = cursor;
        await this.cursors.write({ uidValidity, uid: cursor });
    }
    async collect(client) {
        if (this.fetching)
            return;
        this.fetching = true;
        try {
            const mailbox = client.mailbox;
            if (!mailbox)
                return;
            if (String(mailbox.uidValidity) !== this.uidValidity) {
                await this.prime(client);
                return;
            }
            const range = `${this.cursor + 1}:*`;
            for await (const message of client.fetch({ uid: range }, { uid: true, source: true }, { uid: true })) {
                const uid = message.uid;
                if (typeof uid !== 'number' || uid <= this.cursor || !message.source)
                    continue;
                try {
                    const parsed = await simpleParser(message.source);
                    const job = toJob(this.policy(), parsed);
                    if (job) {
                        this.hooks.onLog?.(`[mail] 收到 ${job.from} 的邮件，投递到 ${job.sessionId}`);
                        this.hooks.onJob(job);
                    }
                    else {
                        const sender = parsed.from?.value?.[0]?.address ?? '未知发件人';
                        this.hooks.onLog?.(`[mail] 忽略 ${sender} 的邮件：不在白名单或缺少发件地址`);
                    }
                }
                catch (error) {
                    this.hooks.onLog?.(`[mail] 解析 UID ${uid} 失败: ${errorMessage(error)}`);
                }
                if (uid > this.cursor) {
                    this.cursor = uid;
                    void this.cursors.write({ uidValidity: this.uidValidity, uid });
                }
            }
        }
        catch (error) {
            if (this.running)
                this.hooks.onLog?.(`[mail] 收信失败: ${errorMessage(error)}`);
        }
        finally {
            this.fetching = false;
        }
    }
    sleep(ms) {
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this.wakeSleep = undefined;
                resolve();
            }, ms);
            this.wakeSleep = () => {
                clearTimeout(timer);
                this.wakeSleep = undefined;
                resolve();
            };
        });
    }
    wake() {
        this.wakeSleep?.();
    }
}
