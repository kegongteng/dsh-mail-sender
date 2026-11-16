import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-mail-sender";
export declare const inject: string[];
/**
 * 先挂载本插件的 Remote 命名空间，再交给一个声明了 `remote.mail-gateway` 的子插件
 * 注册设置页分区。命名空间服务由 `$mount` 提供，若在同一个 fiber 的 `inject` 里声明
 * 它会因为“依赖自己提供”而永久等待激活。
 */
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
