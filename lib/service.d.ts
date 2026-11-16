import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Config } from './config.js';
import type { MailGateway } from './gateway.js';
import type { ConnectionTestResult, MailSnapshot, MailStatus, MailboxPatch } from './types.js';
/** Remote 面：设置页的读写、测试与状态查询。 */
export declare class MailGatewayService extends TypertRemoteService {
    private readonly context;
    private readonly gateway;
    private readonly config;
    private readonly defaultNamespace;
    static inject: string[];
    private namespace?;
    constructor(context: Context, gateway: MailGateway, config: Config, defaultNamespace: string);
    get(): Promise<MailSnapshot>;
    status(): Promise<MailStatus>;
    saveMailbox(patch: MailboxPatch): Promise<MailSnapshot>;
    saveWhitelist(addresses: string[]): Promise<MailSnapshot>;
    testConnection(patch: MailboxPatch): Promise<ConnectionTestResult>;
    /** profile 里的实例 id 通常就是包名；回退用 schema 里的字段名定位。 */
    private resolveNamespace;
}
