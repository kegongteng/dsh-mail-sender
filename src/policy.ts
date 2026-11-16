import type { ParsedMail } from 'mailparser'
import type { MailJob } from './types.js'

/** 规范化后的精确地址集合；只由白名单生成。 */
export type AccessPolicy = ReadonlySet<string>

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase()
}

/** 生成纯策略快照，不改动入参。 */
export function createPolicy(addresses: readonly string[]): AccessPolicy {
  const allowed = new Set<string>()
  for (const address of addresses) {
    const normalized = normalizeAddress(address)
    if (normalized) allowed.add(normalized)
  }
  return allowed
}

export function isAllowed(policy: AccessPolicy, address: string): boolean {
  return policy.has(normalizeAddress(address))
}

function headerText(mail: ParsedMail, name: string): string {
  const value = mail.headers.get(name)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(', ')
  return ''
}

/** 拦截自动回复 / 批量邮件，避免邮件环。 */
export function isAutoReply(mail: ParsedMail): boolean {
  const autoSubmitted = headerText(mail, 'auto-submitted').toLowerCase()
  if (autoSubmitted && autoSubmitted !== 'no') return true

  const precedence = headerText(mail, 'precedence').toLowerCase()
  if (/(^|[\s,;])(bulk|junk|list)([\s,;]|$)/.test(precedence)) return true

  return false
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 正文只取 text/plain，缺失时用 HTML 降级；附件一律丢弃。 */
export function bodyText(mail: ParsedMail): string {
  const plain = mail.text?.trim()
  if (plain) return plain
  if (mail.html) return htmlToText(mail.html)
  return ''
}

function referencesOf(mail: ParsedMail): string | undefined {
  const parts = mail.references
    ? Array.isArray(mail.references)
      ? mail.references
      : [mail.references]
    : []
  const all = [...parts]
  if (mail.messageId && !all.includes(mail.messageId)) all.push(mail.messageId)
  return all.length ? all.join(' ') : undefined
}

/**
 * 一次解析完成准入判断与字段提取：发件地址只解析一次，
 * 不在白名单或命中自动流量时返回 null（静默丢弃）。
 */
export function toJob(policy: AccessPolicy, mail: ParsedMail): MailJob | null {
  const sender = mail.from?.value?.[0]?.address
  if (!sender) return null

  const from = normalizeAddress(sender)
  if (!isAllowed(policy, from)) return null
  if (isAutoReply(mail)) return null

  const text = bodyText(mail)
  if (!text) return null

  return {
    from,
    subject: mail.subject?.trim() || '(无主题)',
    text,
    messageId: mail.messageId,
    references: referencesOf(mail),
    sessionId: `mail:${from}`,
  }
}
