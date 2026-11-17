import { addressesOf, mailboxOf } from './config.js';
import { MailGateway } from './gateway.js';
import { MailGatewayService } from './service.js';
export { Config } from './config.js';
export const name = 'dsh-mail-sender';
export const inject = ['agents', 'sessions', 'settings'];
/**
 * 常驻入口：邮件驱动会话，而不是等待模型调用的 Tool。
 * 所有 IMAP/SMTP 资源与监听都收在 ctx.effect 里按序回收。
 */
export function apply(ctx, config) {
    const gateway = new MailGateway(ctx, mailboxOf(config), addressesOf(config));
    new MailGatewayService(ctx, gateway, config, name);
    ctx.effect(() => {
        const disposeGateway = gateway.start();
        const on = ctx.on;
        const off = on('loader/volatile-update', () => {
            gateway.reload(mailboxOf(config), addressesOf(config));
        });
        return async () => {
            off();
            await disposeGateway();
        };
    });
}
