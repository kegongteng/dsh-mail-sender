import type { Context } from '@deepseek-ai/cordis';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { ConnectionTestResult, MailSnapshot, MailStatus, MailboxPatch } from '../types.js';
/** 设置页使用的全部宿主能力；组件只依赖这个接口。 */
export interface MailGatewayApi {
    get(): Promise<RemoteResult<MailSnapshot>>;
    saveMailbox(patch: MailboxPatch): Promise<RemoteResult<MailSnapshot>>;
    saveWhitelist(addresses: string[]): Promise<RemoteResult<MailSnapshot>>;
    testConnection(patch: MailboxPatch): Promise<RemoteResult<ConnectionTestResult>>;
    status(): Promise<RemoteResult<MailStatus>>;
}
/** 调用方必须已声明 `inject: ['remote.mail-gateway']`，见 client/index.ts 的子插件。 */
export declare function createApi(ctx: Context): MailGatewayApi;
