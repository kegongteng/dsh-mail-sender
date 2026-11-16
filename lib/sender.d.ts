import type { MailJob, MailboxSettings } from './types.js';
/** SMTP 发送器：单例连接池，每封信复用连接。 */
export declare class SmtpSender {
    private mailbox;
    private transporter?;
    private key;
    constructor(mailbox: MailboxSettings);
    update(mailbox: MailboxSettings): void;
    private sync;
    send(job: MailJob, text: string): Promise<void>;
    /** 关闭连接池；不等待在途邮件的重试。 */
    close(): void;
}
