export function createMailbox(settings = {}) {
    return {
        email: settings.email?.trim() ?? '',
        displayName: settings.displayName?.trim() ?? '',
        imapHost: settings.imapHost?.trim() ?? '',
        imapPort: settings.imapPort ?? 993,
        imapSecure: settings.imapSecure ?? true,
        smtpHost: settings.smtpHost?.trim() ?? '',
        smtpPort: settings.smtpPort ?? 465,
        smtpSecure: settings.smtpSecure ?? true,
        username: settings.username?.trim() ?? '',
        password: settings.password ?? '',
    };
}
/** 合并补丁；password 留空时沿用原密码。 */
export function mergeMailbox(current, patch) {
    return createMailbox({
        ...current,
        ...patch,
        password: patch.password ? patch.password : current.password,
    });
}
export function isMailboxConfigured(mailbox) {
    return Boolean(mailbox.email &&
        mailbox.imapHost &&
        mailbox.smtpHost &&
        (mailbox.username || mailbox.email) &&
        mailbox.password);
}
/** 影响连接的身份键；白名单变化不会出现在这里。 */
export function mailboxKey(mailbox) {
    return [
        mailbox.email,
        mailbox.username,
        mailbox.password,
        mailbox.imapHost,
        mailbox.imapPort,
        mailbox.imapSecure,
        mailbox.smtpHost,
        mailbox.smtpPort,
        mailbox.smtpSecure,
    ].join('\u0000');
}
/** 对外展示的邮箱信息，密码始终清空。 */
export function publicMailbox(mailbox) {
    return { ...mailbox, password: '' };
}
export function fromHeader(mailbox) {
    if (!mailbox.displayName)
        return mailbox.email;
    return `"${mailbox.displayName.replace(/"/g, '')}" <${mailbox.email}>`;
}
export function smtpUser(mailbox) {
    return mailbox.username || mailbox.email;
}
