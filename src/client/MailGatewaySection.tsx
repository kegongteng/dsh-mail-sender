import { useEffect, useRef, useState } from 'react'
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
  padding: '6px 8px',
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
const section: CSSProperties = { display: 'grid', gap: 16, maxWidth: 640 }
const row: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }

const logBox: CSSProperties = {
  margin: 0,
  padding: '8px 10px',
  maxHeight: 220,
  overflow: 'auto',
  border: '1px solid var(--dsh-border, #e5e7eb)',
  borderRadius: 6,
  background: 'var(--dsh-code-bg, rgba(127,127,127,0.08))',
  fontSize: 12,
  lineHeight: 1.6,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

export function MailGatewaySection({ api }: MailGatewaySectionProps) {
  const [snapshot, setSnapshot] = useState<MailSnapshot>()
  const [mailbox, setMailbox] = useState<MailboxSettings>()
  const [password, setPassword] = useState('')
  const [allowed, setAllowed] = useState<string[]>([])
  const [entry, setEntry] = useState('')
  const [test, setTest] = useState<ConnectionTestResult>()
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string }>()
  const logRef = useRef<HTMLPreElement>(null)

  // 首次读取填充表单；之后每 3 秒只刷新状态与日志，不覆盖正在编辑的表单。
  useEffect(() => {
    let alive = true
    const load = async (initial: boolean) => {
      const result = await api.get()
      if (!alive) return
      if (!result.ok) {
        if (initial) setNotice({ kind: 'error', text: result.error.message })
        return
      }
      setSnapshot(result.value)
      if (initial) {
        setMailbox({ ...result.value.mailbox })
        setAllowed([...result.value.allowedAddresses])
        setPassword('')
      }
    }
    void load(true)
    const timer = setInterval(() => void load(false), 3000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [api])

  useEffect(() => {
    const box = logRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [snapshot?.logs])

  const applySnapshot = (next: MailSnapshot, resetMailbox: boolean) => {
    setSnapshot(next)
    setAllowed([...next.allowedAddresses])
    if (resetMailbox) {
      setMailbox({ ...next.mailbox })
      setPassword('')
    }
  }

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
      setNotice({ kind: 'ok', text: '已保存，按新配置重连。' })
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
      setNotice({ kind: 'ok', text: '白名单已保存。' })
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

  const textRow = (label: string, key: 'email' | 'displayName' | 'imapHost' | 'smtpHost' | 'username') => (
    <tr>
      <td style={{ ...cell, width: 110 }}>{label}</td>
      <td style={cell}>
        <input style={input} value={mailbox?.[key] ?? ''} onChange={textField(key)} />
      </td>
    </tr>
  )

  const portRow = (label: string, key: 'imapPort' | 'smtpPort') => (
    <tr>
      <td style={{ ...cell, width: 110 }}>{label}</td>
      <td style={cell}>
        <input style={input} value={mailbox?.[key] ?? 0} onChange={numberField(key)} />
      </td>
    </tr>
  )

  const tlsRow = (label: string, key: 'imapSecure' | 'smtpSecure') => (
    <tr>
      <td style={{ ...cell, width: 110 }}>{label}</td>
      <td style={cell}>
        <input type="checkbox" checked={mailbox?.[key] ?? true} onChange={boolField(key)} />
      </td>
    </tr>
  )

  return (
    <div style={section}>
      <StatusCard status={snapshot?.status} allowedCount={allowed.length} test={test} />

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>邮箱绑定</h3>
        <table style={table}>
          <tbody>
            {textRow('邮箱地址', 'email')}
            {textRow('显示名', 'displayName')}
            {textRow('IMAP 主机', 'imapHost')}
            {portRow('IMAP 端口', 'imapPort')}
            {tlsRow('IMAP TLS', 'imapSecure')}
            {textRow('SMTP 主机', 'smtpHost')}
            {portRow('SMTP 端口', 'smtpPort')}
            {tlsRow('SMTP TLS', 'smtpSecure')}
            {textRow('登录用户名', 'username')}
            <tr>
              <td style={{ ...cell, width: 110 }}>密码</td>
              <td style={cell}>
                <input
                  style={input}
                  type="password"
                  value={password}
                  placeholder={snapshot?.passwordSet ? '已设置，留空表示不修改' : '未设置'}
                  onChange={event => setPassword(event.target.value)}
                />
              </td>
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
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>运行日志</h3>
        <pre ref={logRef} style={logBox}>
          {snapshot?.logs?.length ? snapshot.logs.join('\n') : '暂无日志'}
        </pre>
      </div>

      {notice ? (
        <div style={{ color: notice.kind === 'ok' ? '#047857' : '#b91c1c', fontSize: 13 }}>
          {notice.text}
        </div>
      ) : null}
    </div>
  )
}
