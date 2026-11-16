/** 邮箱绑定信息，宿主与客户端共用。 */
export interface MailboxSettings {
  email: string
  displayName: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  username: string
  password: string
}

/** 表单提交的邮箱补丁；空 password 表示不修改已存密码。 */
export interface MailboxPatch {
  email?: string
  displayName?: string
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  username?: string
  password?: string
}

/** 一次被准入的来信。 */
export interface MailJob {
  readonly from: string
  readonly subject: string
  readonly text: string
  readonly messageId?: string
  readonly references?: string
  readonly sessionId: string
}

export type MailPhase = 'disabled' | 'connecting' | 'idle' | 'polling' | 'error'

export interface MailStatus {
  readonly phase: MailPhase
  readonly supportsIdle: boolean
  readonly pollIntervalMs: number
  readonly lastError?: string
  readonly since?: string
}

/** 设置页一次读取的完整快照（不含密码明文）。 */
export interface MailSnapshot {
  readonly mailbox: MailboxSettings
  readonly passwordSet: boolean
  readonly allowedAddresses: readonly string[]
  readonly status: MailStatus
  /** 最近的运行日志（最新的在最后），用于设置页排查收信/回信问题。 */
  readonly logs: readonly string[]
}

export interface ConnectionTestResult {
  readonly ok: boolean
  readonly supportsIdle: boolean
  readonly error?: string
}
