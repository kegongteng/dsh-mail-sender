import nodemailer from 'nodemailer';
import { fromHeader, mailboxKey, smtpUser } from './mailbox.js';
function replySubject(subject) {
    return /^re\s*:/i.test(subject) ? subject : `Re: ${subject}`;
}
/** SMTP 发送器：单例连接池，每封信复用连接。 */
export class SmtpSender {
    mailbox;
    transporter;
    key = '';
    constructor(mailbox) {
        this.mailbox = mailbox;
        this.sync();
    }
    update(mailbox) {
        const next = `${mailboxKey(mailbox)}\u0000${mailbox.displayName}`;
        if (next === this.key)
            return;
        this.close();
        this.mailbox = mailbox;
        this.sync();
    }
    sync() {
        this.key = `${mailboxKey(this.mailbox)}\u0000${this.mailbox.displayName}`;
        this.transporter = nodemailer.createTransport({
            host: this.mailbox.smtpHost,
            port: this.mailbox.smtpPort,
            secure: this.mailbox.smtpSecure,
            requireTLS: !this.mailbox.smtpSecure,
            pool: true,
            maxConnections: 3,
            auth: { user: smtpUser(this.mailbox), pass: this.mailbox.password },
        });
    }
    async send(job, text) {
        if (!this.transporter)
            this.sync();
        await this.transporter.sendMail({
            from: fromHeader(this.mailbox),
            to: job.from,
            subject: replySubject(job.subject),
            text,
            inReplyTo: job.messageId,
            references: job.references ?? job.messageId,
        });
    }
    /** 关闭连接池；不等待在途邮件的重试。 */
    close() {
        this.transporter?.close();
        this.transporter = undefined;
    }
}
