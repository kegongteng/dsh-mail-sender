import type { ParsedMail } from 'mailparser';
import type { MailJob } from './types.js';
/** 规范化后的精确地址集合；只由白名单生成。 */
export type AccessPolicy = ReadonlySet<string>;
export declare function normalizeAddress(address: string): string;
/** 生成纯策略快照，不改动入参。 */
export declare function createPolicy(addresses: readonly string[]): AccessPolicy;
export declare function isAllowed(policy: AccessPolicy, address: string): boolean;
/** 正文只取 text/plain，缺失时用 HTML 降级；附件一律丢弃。 */
export declare function bodyText(mail: ParsedMail): string;
/**
 * 一次解析完成准入判断与字段提取：发件地址只解析一次。
 * 唯一的准入条件是白名单；取不到发件地址时无法建立会话与回信，返回 null。
 */
export declare function toJob(policy: AccessPolicy, mail: ParsedMail): MailJob | null;
