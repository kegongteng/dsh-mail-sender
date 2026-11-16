import type { ParsedMail } from 'mailparser';
import type { MailJob } from './types.js';
/** 规范化后的精确地址集合；只由白名单生成。 */
export type AccessPolicy = ReadonlySet<string>;
export declare function normalizeAddress(address: string): string;
/** 生成纯策略快照，不改动入参。 */
export declare function createPolicy(addresses: readonly string[]): AccessPolicy;
export declare function isAllowed(policy: AccessPolicy, address: string): boolean;
/** 拦截自动回复 / 批量邮件，避免邮件环。 */
export declare function isAutoReply(mail: ParsedMail): boolean;
/** 正文只取 text/plain，缺失时用 HTML 降级；附件一律丢弃。 */
export declare function bodyText(mail: ParsedMail): string;
/**
 * 一次解析完成准入判断与字段提取：发件地址只解析一次，
 * 不在白名单或命中自动流量时返回 null（静默丢弃）。
 */
export declare function toJob(policy: AccessPolicy, mail: ParsedMail): MailJob | null;
