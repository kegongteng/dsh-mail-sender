/** 调用方必须已声明 `inject: ['remote.mail-gateway']`，见 client/index.ts 的子插件。 */
export function createApi(ctx) {
    const remote = ctx.remote['mail-gateway'];
    return {
        get: () => remote.get(),
        saveMailbox: patch => remote.saveMailbox(patch),
        saveWhitelist: addresses => remote.saveWhitelist(addresses),
        testConnection: patch => remote.testConnection(patch),
        status: () => remote.status(),
    };
}
