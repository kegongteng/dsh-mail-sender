import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { fromHeader, mailboxKey, smtpUser } from './mailbox.js'
import type { MailJob, MailboxSettings } from './types.js'

function replySubject(subject: string): string {
  return /^re\s*:/i.test(subject) ? subject : `Re: ${subject}`
}

/** SMTP 发送器：单例连接池，每封信复用连接。 */
export class SmtpSender {
  private transporter?: Transporter
  private key = ''

  constructor(private mailbox: MailboxSettings) {
    this.sync()
  }

  update(mailbox: MailboxSettings): void {
    const next = `${mailboxKey(mailbox)}\u0000${mailbox.displayName}`
    if (next === this.key) return
    this.close()
    this.mailbox = mailbox
    this.sync()
  }

  private sync(): void {
    this.key = `${mailboxKey(this.mailbox)}\u0000${this.mailbox.displayName}`
    this.transporter = nodemailer.createTransport({
      host: this.mailbox.smtpHost,
      port: this.mailbox.smtpPort,
      secure: this.mailbox.smtpSecure,
      requireTLS: !this.mailbox.smtpSecure,
      pool: true,
      maxConnections: 3,
      auth: { user: smtpUser(this.mailbox), pass: this.mailbox.password },
    })
  }

  async send(job: MailJob, text: string): Promise<void> {
    if (!this.transporter) this.sync()
    await this.transporter!.sendMail({
      from: fromHeader(this.mailbox),
      to: job.from,
      subject: replySubject(job.subject),
      text,
      inReplyTo: job.messageId,
      references: job.references ?? job.messageId,
    })
  }

  /** 关闭连接池；不等待在途邮件的重试。 */
  close(): void {
    this.transporter?.close()
    this.transporter = undefined
  }
}
