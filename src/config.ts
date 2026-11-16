import Schema from '@deepseek-ai/schemastery'
import { createMailbox } from './mailbox.js'
import type { MailboxSettings } from './types.js'

/** schemastery `.volatile()` 字段解析后的稳定引用。 */
interface Ref<T> {
  get(): T
}

export interface Config {
  mailbox: Ref<MailboxSettings>
  allowedAddresses: Ref<string[]>
}

const DEFAULT_MAILBOX: MailboxSettings = {
  email: '',
  displayName: '',
  imapHost: '',
  imapPort: 993,
  imapSecure: true,
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  username: '',
  password: '',
}

export const Config = Schema.object({
  mailbox: Schema.object({
    email: Schema.string().default('').description('接收邮件与回信使用的地址'),
    displayName: Schema.string().default('').description('回信时显示的发件人名称，可留空'),
    imapHost: Schema.string().default('').description('IMAP 服务器地址'),
    imapPort: Schema.natural().default(993).description('IMAP 端口，SSL 一般为 993'),
    imapSecure: Schema.boolean().default(true).description('IMAP 是否使用 TLS'),
    smtpHost: Schema.string().default('').description('SMTP 服务器地址'),
    smtpPort: Schema.natural().default(465).description('SMTP 端口，SSL 一般为 465'),
    smtpSecure: Schema.boolean().default(true).description('SMTP 是否使用 TLS'),
    username: Schema.string().default('').description('登录用户名，留空时使用邮箱地址'),
    password: Schema.string().role('secret').default('').description('邮箱密码或应用专用密码'),
  })
    .default(DEFAULT_MAILBOX)
    .volatile()
    .description('dsh-mail-sender 邮箱绑定'),
  allowedAddresses: Schema.array(Schema.string())
    .default([])
    .volatile()
    .description('双向白名单：同时校验入站发件地址与出站回复地址'),
})

export function mailboxOf(config: Config): MailboxSettings {
  return createMailbox(config.mailbox.get())
}

export function addressesOf(config: Config): string[] {
  return [...(config.allowedAddresses.get() ?? [])]
}
