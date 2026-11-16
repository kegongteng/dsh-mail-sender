import { z } from 'zod'
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'
import type { RemoteResult, TypertRemoteInfo, TypertRemoteMethod } from '@deepseek-ai/dsh-typert-protocol'
import type { ConnectionTestResult, MailSnapshot, MailStatus, MailboxPatch } from './types.js'

const mailboxSchema = () =>
  z.object({
    email: z.string(),
    displayName: z.string(),
    imapHost: z.string(),
    imapPort: z.number(),
    imapSecure: z.boolean(),
    smtpHost: z.string(),
    smtpPort: z.number(),
    smtpSecure: z.boolean(),
    username: z.string(),
    password: z.string(),
  })

const statusSchema = () =>
  z.object({
    phase: z.enum(['disabled', 'connecting', 'idle', 'polling', 'error']),
    supportsIdle: z.boolean(),
    pollIntervalMs: z.number(),
    lastError: z.string().optional(),
    since: z.string().optional(),
  })

const snapshotSchema = () =>
  z.object({
    mailbox: mailboxSchema(),
    passwordSet: z.boolean(),
    allowedAddresses: z.array(z.string()),
    status: statusSchema(),
    logs: z.array(z.string()),
  })

const patchSchema = () =>
  z.object({
    email: z.string().optional(),
    displayName: z.string().optional(),
    imapHost: z.string().optional(),
    imapPort: z.number().optional(),
    imapSecure: z.boolean().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpSecure: z.boolean().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  })

const testResultSchema = () =>
  z.object({
    ok: z.boolean(),
    supportsIdle: z.boolean(),
    error: z.string().optional(),
  })

function codec(typeSymbol: string, create: () => z.ZodType) {
  return { mode: 'strict' as const, typeSymbol, create }
}

function jsonParameter(name: string, typeSymbol: string, create: () => z.ZodType) {
  return {
    name,
    source: 'json' as const,
    codec: codec(typeSymbol, create),
    strictCodec: codec(`${typeSymbol}#strict`, create),
  }
}

export const TYPERT_REMOTE = createTypertRemoteInfo({
  package: 'dsh-mail-sender',
  methods: {
    'mail-gateway/get': {
      service: 'mailGateway',
      invocation: { kind: 'direct' },
      parameters: [],
      result: codec('dsh-mail-sender#MailSnapshot', snapshotSchema),
    },
    'mail-gateway/saveMailbox': {
      service: 'mailGateway',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('patch', 'dsh-mail-sender#MailboxPatch', patchSchema)],
      result: codec('dsh-mail-sender#MailSnapshot', snapshotSchema),
    },
    'mail-gateway/saveWhitelist': {
      service: 'mailGateway',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('addresses', 'dsh-mail-sender#AddressList', () => z.array(z.string()))],
      result: codec('dsh-mail-sender#MailSnapshot', snapshotSchema),
    },
    'mail-gateway/testConnection': {
      service: 'mailGateway',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('patch', 'dsh-mail-sender#MailboxPatch', patchSchema)],
      result: codec('dsh-mail-sender#ConnectionTestResult', testResultSchema),
    },
    'mail-gateway/status': {
      service: 'mailGateway',
      invocation: { kind: 'direct' },
      parameters: [],
      result: codec('dsh-mail-sender#MailStatus', statusSchema),
    },
  },
}, z) as TypertRemoteInfo<{
  readonly 'mail-gateway/get': TypertRemoteMethod<{}, MailSnapshot>
  readonly 'mail-gateway/saveMailbox': TypertRemoteMethod<{ patch: MailboxPatch }, MailSnapshot>
  readonly 'mail-gateway/saveWhitelist': TypertRemoteMethod<{ addresses: readonly string[] }, MailSnapshot>
  readonly 'mail-gateway/testConnection': TypertRemoteMethod<{ patch: MailboxPatch }, ConnectionTestResult>
  readonly 'mail-gateway/status': TypertRemoteMethod<{}, MailStatus>
}>

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespace$6d61696c2d67617465776179 {
    get: () => Promise<RemoteResult<MailSnapshot>>
    saveMailbox: (patch: MailboxPatch) => Promise<RemoteResult<MailSnapshot>>
    saveWhitelist: (addresses: string[]) => Promise<RemoteResult<MailSnapshot>>
    testConnection: (patch: MailboxPatch) => Promise<RemoteResult<ConnectionTestResult>>
    status: () => Promise<RemoteResult<MailStatus>>
  }
  interface TypertRemoteMap {
    'mail-gateway/get': () => Promise<RemoteResult<MailSnapshot>>
    'mail-gateway/saveMailbox': (patch: MailboxPatch) => Promise<RemoteResult<MailSnapshot>>
    'mail-gateway/saveWhitelist': (addresses: string[]) => Promise<RemoteResult<MailSnapshot>>
    'mail-gateway/testConnection': (patch: MailboxPatch) => Promise<RemoteResult<ConnectionTestResult>>
    'mail-gateway/status': () => Promise<RemoteResult<MailStatus>>
  }
  interface TypertRemoteNamespaceMap {
    'mail-gateway': TypertRemoteNamespace$6d61696c2d67617465776179
  }
}

export default TYPERT_REMOTE
