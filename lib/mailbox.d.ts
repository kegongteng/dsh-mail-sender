import type { MailboxPatch, MailboxSettings } from './types.js';
export declare function createMailbox(settings?: Partial<MailboxSettings>): MailboxSettings;
/** 合并补丁；password 留空时沿用原密码。 */
export declare function mergeMailbox(current: MailboxSettings, patch: MailboxPatch): MailboxSettings;
export declare function isMailboxConfigured(mailbox: MailboxSettings): boolean;
/** 影响连接的身份键；白名单变化不会出现在这里。 */
export declare function mailboxKey(mailbox: MailboxSettings): string;
/** 对外展示的邮箱信息，密码始终清空。 */
export declare function publicMailbox(mailbox: MailboxSettings): MailboxSettings;
export declare function fromHeader(mailbox: MailboxSettings): string;
export declare function smtpUser(mailbox: MailboxSettings): string;
