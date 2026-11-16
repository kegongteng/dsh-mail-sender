import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-mail-sender";
export declare const inject: string[];
/** 挂载本插件的 Remote 命名空间，并在设置页注册“邮件网关”分区。 */
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
