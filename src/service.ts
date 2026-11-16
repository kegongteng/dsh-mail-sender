import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { Config } from './config.js'
import type { MailGateway } from './gateway.js'
import { createMailbox, mergeMailbox } from './mailbox.js'
import { normalizeAddress } from './policy.js'
import { probeIdle } from './receiver.js'
import type {
  ConnectionTestResult,
  MailSnapshot,
  MailStatus,
  MailboxPatch,
  MailboxSettings,
} from './types.js'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function validate(mailbox: MailboxSettings): string | undefined {
  if (!mailbox.email) return '请填写邮箱地址'
  if (!mailbox.imapHost) return '请填写 IMAP 主机'
  if (!mailbox.smtpHost) return '请填写 SMTP 主机'
  if (!(mailbox.username || mailbox.email)) return '请填写登录用户名'
  if (!mailbox.password) return '请填写密码'
  if (!Number.isInteger(mailbox.imapPort) || mailbox.imapPort <= 0) return 'IMAP 端口无效'
  if (!Number.isInteger(mailbox.smtpPort) || mailbox.smtpPort <= 0) return 'SMTP 端口无效'
  return undefined
}

/** Remote 面：设置页的读写、测试与状态查询。 */
export class MailGatewayService extends TypertRemoteService {
  static inject = ['settings']

  private namespace?: string

  constructor(
    private readonly context: Context,
    private readonly gateway: MailGateway,
    private readonly config: Config,
    private readonly defaultNamespace: string,
  ) {
    super(context, 'mailGateway', { namespace: 'mail-gateway' })
  }

  @Remote('get')
  async get(): Promise<MailSnapshot> {
    return this.gateway.snapshot()
  }

  @Remote('status')
  async status(): Promise<MailStatus> {
    return this.gateway.snapshot().status
  }

  @Remote('saveMailbox')
  async saveMailbox(patch: MailboxPatch): Promise<MailSnapshot> {
    const current = createMailbox(this.config.mailbox.get())
    const next = mergeMailbox(current, patch)
    const invalid = validate(next)
    if (invalid) throw new RemoteError('gateway/bad-request', invalid, {})

    const ops: { op: 'set'; path: string[]; value: unknown }[] = []
    for (const field of [
      'email',
      'displayName',
      'imapHost',
      'imapPort',
      'imapSecure',
      'smtpHost',
      'smtpPort',
      'smtpSecure',
      'username',
    ] as const) {
      if (next[field] !== current[field]) ops.push({ op: 'set', path: ['mailbox', field], value: next[field] })
    }
    // 密码留空表示不修改，且绝不把已存密码回写到表单。
    if (next.password !== current.password) {
      ops.push({ op: 'set', path: ['mailbox', 'password'], value: next.password })
    }

    try {
      if (ops.length) await this.context.settings.mutate(this.resolveNamespace(), ops)
    } catch (error) {
      throw new RemoteError('gateway/internal', messageOf(error), {})
    }

    this.gateway.reload(next, this.config.allowedAddresses.get() ?? [])
    return this.gateway.snapshot()
  }

  @Remote('saveWhitelist')
  async saveWhitelist(addresses: string[]): Promise<MailSnapshot> {
    const normalized = [...new Set(addresses.map(normalizeAddress).filter(Boolean))]

    try {
      await this.context.settings.mutate(this.resolveNamespace(), [
        { op: 'set', path: ['allowedAddresses'], value: normalized },
      ])
    } catch (error) {
      throw new RemoteError('gateway/internal', messageOf(error), {})
    }

    // 只更新内存策略，不断开 IMAP 连接。
    this.gateway.updatePolicy(normalized)
    return this.gateway.snapshot()
  }

  @Remote('testConnection')
  async testConnection(patch: MailboxPatch): Promise<ConnectionTestResult> {
    const mailbox = mergeMailbox(createMailbox(this.config.mailbox.get()), patch)
    if (!mailbox.imapHost || !(mailbox.username || mailbox.email) || !mailbox.password) {
      return { ok: false, supportsIdle: false, error: '请先填写 IMAP 主机、用户名和密码' }
    }

    try {
      return { ok: true, supportsIdle: await probeIdle(mailbox) }
    } catch (error) {
      return { ok: false, supportsIdle: false, error: messageOf(error) }
    }
  }

  /** profile 里的实例 id 通常就是包名；回退用 schema 里的字段名定位。 */
  private resolveNamespace(): string {
    if (this.namespace) return this.namespace
    const descriptors = this.context.settings.describe()
    const own =
      descriptors.find(item => item.ns === this.defaultNamespace) ??
      descriptors.find(item => JSON.stringify(item.schema ?? '').includes('imapHost'))

    if (!own) {
      throw new RemoteError('gateway/bad-request', '未找到 dsh-mail-sender 的配置项', {})
    }
    this.namespace = own.ns
    return own.ns
  }
}
