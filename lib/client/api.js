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
