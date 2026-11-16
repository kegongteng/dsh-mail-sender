import Schema from '@deepseek-ai/schemastery';
import type { MailboxSettings } from './types.js';
/** schemastery `.volatile()` 字段解析后的稳定引用。 */
interface Ref<T> {
    get(): T;
}
export interface Config {
    mailbox: Ref<MailboxSettings>;
    allowedAddresses: Ref<string[]>;
}
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    mailbox: Schema<NoInfer<Schemastery.ObjectS<NoInfer<{
        email: Schema<string, string, "defined">;
        displayName: Schema<string, string, "defined">;
        imapHost: Schema<string, string, "defined">;
        imapPort: Schema<number, number, "defined">;
        imapSecure: Schema<boolean, boolean, "defined">;
        smtpHost: Schema<string, string, "defined">;
        smtpPort: Schema<number, number, "defined">;
        smtpSecure: Schema<boolean, boolean, "defined">;
        username: Schema<string, string, "defined">;
        password: Schema<string, string, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        email: Schema<string, string, "defined">;
        displayName: Schema<string, string, "defined">;
        imapHost: Schema<string, string, "defined">;
        imapPort: Schema<number, number, "defined">;
        imapSecure: Schema<boolean, boolean, "defined">;
        smtpHost: Schema<string, string, "defined">;
        smtpPort: Schema<number, number, "defined">;
        smtpSecure: Schema<boolean, boolean, "defined">;
        username: Schema<string, string, "defined">;
        password: Schema<string, string, "defined">;
    }>>>, "volatile-defined">;
    allowedAddresses: Schema<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    mailbox: Schema<NoInfer<Schemastery.ObjectS<NoInfer<{
        email: Schema<string, string, "defined">;
        displayName: Schema<string, string, "defined">;
        imapHost: Schema<string, string, "defined">;
        imapPort: Schema<number, number, "defined">;
        imapSecure: Schema<boolean, boolean, "defined">;
        smtpHost: Schema<string, string, "defined">;
        smtpPort: Schema<number, number, "defined">;
        smtpSecure: Schema<boolean, boolean, "defined">;
        username: Schema<string, string, "defined">;
        password: Schema<string, string, "defined">;
    }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
        email: Schema<string, string, "defined">;
        displayName: Schema<string, string, "defined">;
        imapHost: Schema<string, string, "defined">;
        imapPort: Schema<number, number, "defined">;
        imapSecure: Schema<boolean, boolean, "defined">;
        smtpHost: Schema<string, string, "defined">;
        smtpPort: Schema<number, number, "defined">;
        smtpSecure: Schema<boolean, boolean, "defined">;
        username: Schema<string, string, "defined">;
        password: Schema<string, string, "defined">;
    }>>>, "volatile-defined">;
    allowedAddresses: Schema<NoInfer<string[]>, NoInfer<string[]>, "volatile-defined">;
}>>, "plain">;
export declare function mailboxOf(config: Config): MailboxSettings;
export declare function addressesOf(config: Config): string[];
export {};
