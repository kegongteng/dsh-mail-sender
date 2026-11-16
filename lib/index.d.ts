import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.js';
export { Config } from './config.js';
export declare const name = "dsh-mail-sender";
export declare const inject: string[];
/**
 * 常驻入口：邮件驱动会话，而不是等待模型调用的 Tool。
 * 所有 IMAP/SMTP 资源与监听都收在 ctx.effect 里按序回收。
 */
export declare function apply(ctx: Context, config: Config): void;
