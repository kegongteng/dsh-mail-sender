import { ImapFlow } from 'imapflow'
import nodemailer from 'nodemailer'
import { simpleParser } from 'mailparser'
import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import Schema from '@deepseek-ai/schemastery'

export const name = 'dsh-mail-sender'
export const inject = ['agents']

/** schemastery `.volatile()` 字段解析后的稳定引用 */
interface Ref<T> {
  get(): T
}

export interface Config {
  /** 机器人邮箱，同时用于 IMAP/SMTP 登录与回信 From */
  email: Ref<string>
  /** 邮箱密码或授权码 */
  password: Ref<string>
  imapHost: Ref<string>
  smtpHost: Ref<string>
  /** SMTP 端口，465 走 SSL，其余走 STARTTLS */
  smtpPort: Ref<number>
  /** 入站+出站白名单 */
  allowedAddresses: Ref<string[]>
}

export const Config = Schema.object({
  email: Schema.string().volatile().default('').description('机器人邮箱，如 agent@qq.com'),
  password: Schema.string().volatile().default('').description('邮箱密码或授权码'),
  imapHost: Schema.string().volatile().default('').description('IMAP 服务器，如 imap.qq.com'),
  smtpHost: Schema.string().volatile().default('').description('SMTP 服务器，如 smtp.qq.com'),
  smtpPort: Schema.number().volatile().default(465).description('SMTP 端口，465 走 SSL，587 走 STARTTLS'),
  allowedAddresses: Schema.array(Schema.string())
    .volatile()
    .default([])
    .description('允许与 agent 通信的邮箱地址'),
})

interface Servers {
  email: string
  password: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
}

function resolveServers(config: Config): Servers {
  const smtpPort = config.smtpPort.get()
  return {
    email: config.email.get().trim(),
    password: config.password.get(),
    imapHost: config.imapHost.get().trim(),
    imapPort: 993,
    smtpHost: config.smtpHost.get().trim(),
    smtpPort,
    smtpSecure: smtpPort === 465,
  }
}

interface MailInfo {
  from: string
  subject: string
  messageId?: string
}

export function apply(ctx: Context, config: Config): void {
  // sessionId -> agent handle
  const handles = new Map<string, { dispose(): void; agent: { followup(m: unknown): void } }>()
  // sessionId -> 最近一封来信（用于回复）
  const lastMail = new Map<string, MailInfo>()
  // `${sessionId}:${turn}` -> 该 turn 内累积的 assistant 文本
  const turnBuffers = new Map<string, string[]>()

  let client: ImapFlow | undefined
  let lock: { release(): void } | undefined
  let startedKey = ''

  let smtp: ReturnType<typeof nodemailer.createTransport> | undefined
  let smtpKey = ''

  const stopImap = async () => {
    startedKey = ''
    try { lock?.release() } catch {}
    lock = undefined
    const current = client
    client = undefined
    if (current) await current.logout().catch(() => {})
  }

  const ensureStarted = async () => {
    const servers = resolveServers(config)
    const key = JSON.stringify(servers)
    if (key === startedKey) return
    await stopImap()

    if (!servers.email || !servers.password || !servers.imapHost || !servers.smtpHost) {
      console.warn('[mail-bot] 请在 设置 → 插件 → dsh-mail-sender 填写邮箱、密码与 IMAP/SMTP 服务器')
      return
    }

    const next = new ImapFlow({
      host: servers.imapHost,
      port: servers.imapPort,
      secure: true,
      auth: { user: servers.email, pass: servers.password },
      logger: false,
    })
    client = next
    startedKey = key

    next.on('exists', async () => {
      try {
        const mb = next.mailbox
        if (mb === false) return
        const fetched = await next.fetchOne(mb.exists, { source: true })
        if (fetched === false || !fetched.source) return

        const parsed = await simpleParser(fetched.source)
        const from = (parsed.from?.value?.[0]?.address || '').toLowerCase()
        if (!from) return

        // 白名单：不在名单内直接丢弃
        const allowed = new Set(config.allowedAddresses.get().map(a => a.toLowerCase().trim()))
        if (!allowed.has(from)) return

        const sessionId = `mail-${from}`
        lastMail.set(sessionId, {
          from,
          subject: parsed.subject || '(no subject)',
          messageId: parsed.messageId,
        })

        // 同一发件人同一会话
        let handle = handles.get(sessionId)
        if (!handle) {
          handle = await getOrCreateAgent(ctx, sessionId)
          handles.set(sessionId, handle)
        }

        handle.agent.followup(createUserMessage({
          content: [{ type: 'text', text: parsed.text || '' }],
          source: { kind: 'plugin', plugin: name },
        }))
      } catch (err) {
        console.error('[mail-bot] 收信失败', err)
      }
    })

    try {
      await next.connect()
      if (client !== next) return void next.logout().catch(() => {})
      lock = await next.getMailboxLock('INBOX')
    } catch (err) {
      console.error('[mail-bot] IMAP 连接失败', err)
      if (client === next) await stopImap()
    }
  }

  const getSmtp = (servers: Servers) => {
    const key = `${servers.smtpHost}:${servers.smtpPort}:${servers.smtpSecure}:${servers.email}`
    if (smtpKey !== key) {
      smtp = nodemailer.createTransport({
        host: servers.smtpHost,
        port: servers.smtpPort,
        secure: servers.smtpSecure,
        requireTLS: !servers.smtpSecure,
        auth: { user: servers.email, pass: servers.password },
      })
      smtpKey = key
    }
    return smtp!
  }

  // 设置保存后（volatile 更新）自动按新配置重连
  ;(ctx as any).on('loader/volatile-update', () => { void ensureStarted() })

  // 只处理本插件创建的邮件会话
  ;(ctx as any).on('session/event', (session: any, event: any) => {
    const id = session?.header?.id
    if (typeof id === 'string' && handles.has(id)) handleSessionEvent(id, event)
  })

  ctx.effect(() => {
    void ensureStarted()
    return () => {
      for (const h of handles.values()) {
        try { h.dispose() } catch {}
      }
      handles.clear()
      turnBuffers.clear()
      lastMail.clear()
      void stopImap()
    }
  })

  function handleSessionEvent(sessionId: string, event: any): void {
    const data = event?.data ?? {}
    const turn = data.turn
    const key = `${sessionId}:${turn}`

    if (event.type === 'assistant/message') {
      const text = (data.message?.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
      if (!text) return
      turnBuffers.set(key, [...(turnBuffers.get(key) ?? []), text])
      return
    }

    // 一轮完整结束后才回信；一个 turn 可能含多个 step
    if (event.type === 'turn/end' && data.reason?.kind === 'completed') {
      const replyText = (turnBuffers.get(key) ?? []).join('\n\n').trim()
      turnBuffers.delete(key)
      if (!replyText) return

      const mail = lastMail.get(sessionId)
      if (!mail) return

      const servers = resolveServers(config)
      const subject = mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`
      getSmtp(servers).sendMail({
        from: servers.email,
        to: mail.from,
        subject,
        text: replyText,
        inReplyTo: mail.messageId,
        references: mail.messageId,
      }).catch(err => console.error('[mail-bot] 回信失败', err))
    }
  }
}

async function getOrCreateAgent(
  ctx: Context,
  sessionId: string,
): Promise<{ dispose(): void; agent: { followup(m: unknown): void } }> {
  const agents = (ctx as any).agents
  try {
    return await agents.resume({ resumeSessionId: sessionId })
  } catch {
    return await agents.create({ sessionId })
  }
}
