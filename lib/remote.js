import { z } from 'zod';
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info';
const mailboxSchema = () => z.object({
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
});
const statusSchema = () => z.object({
    phase: z.enum(['disabled', 'connecting', 'idle', 'polling', 'error']),
    supportsIdle: z.boolean(),
    pollIntervalMs: z.number(),
    lastError: z.string().optional(),
    since: z.string().optional(),
});
const snapshotSchema = () => z.object({
    mailbox: mailboxSchema(),
    passwordSet: z.boolean(),
    allowedAddresses: z.array(z.string()),
    status: statusSchema(),
    logs: z.array(z.string()),
});
const patchSchema = () => z.object({
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
});
const testResultSchema = () => z.object({
    ok: z.boolean(),
    supportsIdle: z.boolean(),
    error: z.string().optional(),
});
function codec(typeSymbol, create) {
    return { mode: 'strict', typeSymbol, create };
}
function jsonParameter(name, typeSymbol, create) {
    return {
        name,
        source: 'json',
        codec: codec(typeSymbol, create),
        strictCodec: codec(`${typeSymbol}#strict`, create),
    };
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
}, z);
export default TYPERT_REMOTE;
