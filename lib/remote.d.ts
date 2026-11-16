import type { RemoteResult, TypertRemoteInfo, TypertRemoteMethod } from '@deepseek-ai/dsh-typert-protocol';
import type { ConnectionTestResult, MailSnapshot, MailStatus, MailboxPatch } from './types.js';
export declare const TYPERT_REMOTE: TypertRemoteInfo<{
    readonly "mail-gateway/get": TypertRemoteMethod<{}, MailSnapshot>;
    readonly "mail-gateway/saveMailbox": TypertRemoteMethod<{
        patch: MailboxPatch;
    }, MailSnapshot>;
    readonly "mail-gateway/saveWhitelist": TypertRemoteMethod<{
        addresses: readonly string[];
    }, MailSnapshot>;
    readonly "mail-gateway/testConnection": TypertRemoteMethod<{
        patch: MailboxPatch;
    }, ConnectionTestResult>;
    readonly "mail-gateway/status": TypertRemoteMethod<{}, MailStatus>;
}>;
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$6d61696c2d67617465776179 {
        get: () => Promise<RemoteResult<MailSnapshot>>;
        saveMailbox: (patch: MailboxPatch) => Promise<RemoteResult<MailSnapshot>>;
        saveWhitelist: (addresses: string[]) => Promise<RemoteResult<MailSnapshot>>;
        testConnection: (patch: MailboxPatch) => Promise<RemoteResult<ConnectionTestResult>>;
        status: () => Promise<RemoteResult<MailStatus>>;
    }
    interface TypertRemoteMap {
        'mail-gateway/get': () => Promise<RemoteResult<MailSnapshot>>;
        'mail-gateway/saveMailbox': (patch: MailboxPatch) => Promise<RemoteResult<MailSnapshot>>;
        'mail-gateway/saveWhitelist': (addresses: string[]) => Promise<RemoteResult<MailSnapshot>>;
        'mail-gateway/testConnection': (patch: MailboxPatch) => Promise<RemoteResult<ConnectionTestResult>>;
        'mail-gateway/status': () => Promise<RemoteResult<MailStatus>>;
    }
    interface TypertRemoteNamespaceMap {
        'mail-gateway': TypertRemoteNamespace$6d61696c2d67617465776179;
    }
}
export default TYPERT_REMOTE;
