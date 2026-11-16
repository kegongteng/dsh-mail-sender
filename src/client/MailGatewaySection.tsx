import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent } from 'react'
import type { MailGatewayApi } from './api.js'
import { StatusCard } from './StatusCard.js'
import type {
  ConnectionTestResult,
  MailSnapshot,
  MailboxPatch,
  MailboxSettings,
} from '../types.js'

export interface MailGatewaySectionProps {
  api: MailGatewayApi
}

type Busy = 'mailbox' | 'whitelist' | 'test' | null

const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}

const cell: CSSProperties = {
  borderBottom: '1px solid var(--dsh-border, #e5e7eb)',
  padding: '8px 10px',
  verticalAlign: 'middle',
  textAlign: 'left',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid var(--dsh-border, #d1d5db)',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  fontSize: 13,
}

const button: CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--dsh-border, #d1d5db)',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: 13,
}

const primary: CSSProperties = {
  ...button,
  borderColor: '#2563eb',
  background: '#2563eb',
  color: '#fff',
}

const muted: CSSProperties = { color: '#6b7280', fontSize: 12 }
const section: CSSProperties = { display: 'grid', gap: 16, maxWidth: 760 }
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

export function MailGatewaySection({ api }: MailGatewaySectionProps) {
  const [snapshot, setSnapshot] = useState<MailSnapshot>()
  const [mailbox, setMailbox] = useState<MailboxSettings>()
  const [password, setPassword] = useState('')
  const [allowed, setAllowed] = useState<string[]>([])
  const [entry, setEntry] = useState('')
  const [test, setTest] = useState<ConnectionTestResult>()
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string }>()

  const applySnapshot = (next: MailSnapshot, resetMailbox: boolean) => {
    setSnapshot(next)
    setAllowed([...next.allowedAddresses])
    if (resetMailbox) {
      setMailbox({ ...next.mailbox })
      setPassword('')
    }
  }

  useEffect(() => {
    let alive = true
    void api.get().then(result => {
      if (!alive) return
      if (result.ok) applySnapshot(result.value, true)
      else setNotice({ kind: 'error', text: result.error.message })
    })
    return () => {
      alive = false
    }
  }, [api])

  const setField = <K extends keyof MailboxSettings>(key: K, value: MailboxSettings[K]) => {
    setMailbox(current => (current ? { ...current, [key]: value } : current))
  }

  const patch = (source: MailboxSettings): MailboxPatch => ({
    ...source,
    password: password ? password : undefined,
  })

  const saveMailbox = async () => {
    if (!mailbox) return
    setBusy('mailbox')
    setNotice(undefined)
    const result = await api.saveMailbox(patch(mailbox))
    setBusy(null)
    if (result.ok) {
      applySnapshot(result.value, true)
      setTest(undefined)
      setNotice({ kind: 'ok', text: '邮箱绑定已保存，连接已按新配置重建。' })
    } else {
      setNotice({ kind: 'error', text: result.error.message })
    }
  }

  const testConnection = async () => {
    if (!mailbox) return
    setBusy('test')
    setNotice(undefined)
    const result = await api.testConnection(patch(mailbox))
    setBusy(null)
    if (result.ok) {
      setTest(result.value)
    } else {
      setNotice({ kind: 'error', text: result.error.message })
    }
  }

  const addAddress = () => {
    const address = entry.trim().toLowerCase()
    if (!address) return
    setAllowed(current => (current.includes(address) ? current : [...current, address]))
    setEntry('')
  }

  const onEntryKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addAddress()
  }

  const removeAddress = (address: string) => {
    setAllowed(current => current.filter(item => item !== address))
  }

  const saveWhitelist = async () => {
    setBusy('whitelist')
    setNotice(undefined)
    const result = await api.saveWhitelist(allowed)
    setBusy(null)
    if (result.ok) {
      applySnapshot(result.value, false)
      setNotice({ kind: 'ok', text: '白名单已保存，收信策略立即生效，连接保持不变。' })
    } else {
      setNotice({ kind: 'error', text: result.error.message })
    }
  }

  const numberField = (key: 'imapPort' | 'smtpPort') => (event: ChangeEvent<HTMLInputElement>) => {
    setField(key, Number(event.target.value) || 0)
  }

  const textField = (
    key: 'email' | 'displayName' | 'imapHost' | 'smtpHost' | 'username',
  ) => (event: ChangeEvent<HTMLInputElement>) => {
    setField(key, event.target.value)
  }

  const boolField = (key: 'imapSecure' | 'smtpSecure') => (event: ChangeEvent<HTMLInputElement>) => {
    setField(key, event.target.checked)
  }

  return (
    <div style={section}>
      <StatusCard status={snapshot?.status} allowedCount={allowed.length} test={test} />

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>邮箱绑定</h3>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...cell, ...muted, width: 140 }}>字段</th>
              <th style={{ ...cell, ...muted }}>值</th>
              <th style={{ ...cell, ...muted, width: 240 }}>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell}>邮箱地址</td>
              <td style={cell}>
                <input style={input} value={mailbox?.email ?? ''} onChange={textField('email')} />
              </td>
              <td style={{ ...cell, ...muted }}>接收邮件与回信使用的地址。</td>
            </tr>
            <tr>
              <td style={cell}>显示名</td>
              <td style={cell}>
                <input style={input} value={mailbox?.displayName ?? ''} onChange={textField('displayName')} />
              </td>
              <td style={{ ...cell, ...muted }}>回信时的发件人名称，可留空。</td>
            </tr>
            <tr>
              <td style={cell}>IMAP 主机</td>
              <td style={cell}>
                <input style={input} value={mailbox?.imapHost ?? ''} onChange={textField('imapHost')} />
              </td>
              <td style={{ ...cell, ...muted }}>标准 IMAP 服务器地址。</td>
            </tr>
            <tr>
              <td style={cell}>IMAP 端口</td>
              <td style={cell}>
                <input style={input} value={mailbox?.imapPort ?? 993} onChange={numberField('imapPort')} />
              </td>
              <td style={{ ...cell, ...muted }}>SSL 一般为 993。</td>
            </tr>
            <tr>
              <td style={cell}>IMAP TLS</td>
              <td style={cell}>
                <input type="checkbox" checked={mailbox?.imapSecure ?? true} onChange={boolField('imapSecure')} />
              </td>
              <td style={{ ...cell, ...muted }}>勾选表示使用 SSL/TLS。</td>
            </tr>
            <tr>
              <td style={cell}>SMTP 主机</td>
              <td style={cell}>
                <input style={input} value={mailbox?.smtpHost ?? ''} onChange={textField('smtpHost')} />
              </td>
              <td style={{ ...cell, ...muted }}>标准 SMTP 服务器地址。</td>
            </tr>
            <tr>
              <td style={cell}>SMTP 端口</td>
              <td style={cell}>
                <input style={input} value={mailbox?.smtpPort ?? 465} onChange={numberField('smtpPort')} />
              </td>
              <td style={{ ...cell, ...muted }}>SSL 一般为 465。</td>
            </tr>
            <tr>
              <td style={cell}>SMTP TLS</td>
              <td style={cell}>
                <input type="checkbox" checked={mailbox?.smtpSecure ?? true} onChange={boolField('smtpSecure')} />
              </td>
              <td style={{ ...cell, ...muted }}>勾选表示使用 SSL/TLS。</td>
            </tr>
            <tr>
              <td style={cell}>登录用户名</td>
              <td style={cell}>
                <input style={input} value={mailbox?.username ?? ''} onChange={textField('username')} />
              </td>
              <td style={{ ...cell, ...muted }}>留空时使用邮箱地址。</td>
            </tr>
            <tr>
              <td style={cell}>密码</td>
              <td style={cell}>
                <input
                  style={input}
                  type="password"
                  value={password}
                  placeholder={snapshot?.passwordSet ? '已设置，留空表示不修改' : '未设置'}
                  onChange={event => setPassword(event.target.value)}
                />
              </td>
              <td style={{ ...cell, ...muted }}>保存后只显示“已设置”，不会回显明文。</td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...row, marginTop: 10 }}>
          <button style={primary} disabled={busy !== null} onClick={() => void saveMailbox()}>
            {busy === 'mailbox' ? '保存中…' : '保存邮箱绑定'}
          </button>
          <button style={button} disabled={busy !== null} onClick={() => void testConnection()}>
            {busy === 'test' ? '测试中…' : '测试连接'}
          </button>
          <span style={muted}>保存邮箱绑定时会按新配置重建连接。</span>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>白名单</h3>
        <div style={{ ...row, marginBottom: 8 }}>
          <input
            style={{ ...input, maxWidth: 320 }}
            value={entry}
            placeholder="输入邮箱地址后回车添加"
            onChange={event => setEntry(event.target.value)}
            onKeyDown={onEntryKey}
          />
          <button style={button} onClick={addAddress}>
            添加
          </button>
        </div>
        <table style={table}>
          <tbody>
            {allowed.length === 0 ? (
              <tr>
                <td style={{ ...cell, ...muted }}>暂无地址，白名单为空时不会接收任何邮件。</td>
              </tr>
            ) : (
              allowed.map(address => (
                <tr key={address}>
                  <td style={cell}>{address}</td>
                  <td style={{ ...cell, width: 80, textAlign: 'right' }}>
                    <button style={button} onClick={() => removeAddress(address)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ ...row, marginTop: 10 }}>
          <button style={primary} disabled={busy !== null} onClick={() => void saveWhitelist()}>
            {busy === 'whitelist' ? '保存中…' : '保存白名单'}
          </button>
          <span style={muted}>同一份白名单同时校验入站发件地址与出站回复地址。</span>
        </div>
      </div>

      {notice ? (
        <div style={{ color: notice.kind === 'ok' ? '#047857' : '#b91c1c', fontSize: 13 }}>
          {notice.text}
        </div>
      ) : null}
    </div>
  )
}
