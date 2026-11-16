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
/**
 * 直接调用已挂载贡献的方法描述符，不经过 `ctx.remote['mail-gateway']`。
 * 命名空间访问器要求调用方声明 `inject: ['remote.mail-gateway']`，而该服务只在
 * `$mount` 之后才存在，声明它会形成等待依赖的死锁。
 */
export declare function createApi(ctx: Context): MailGatewayApi;
