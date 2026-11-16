import TYPERT_REMOTE from '../remote.js';
/**
 * 直接调用已挂载贡献的方法描述符，不经过 `ctx.remote['mail-gateway']`。
 * 命名空间访问器要求调用方声明 `inject: ['remote.mail-gateway']`，而该服务只在
 * `$mount` 之后才存在，声明它会形成等待依赖的死锁。
 */
export function createApi(ctx) {
    const methods = TYPERT_REMOTE.methods;
    return {
        get: () => methods['mail-gateway/get'].invoke(ctx.remote, {}),
        saveMailbox: patch => methods['mail-gateway/saveMailbox'].invoke(ctx.remote, { patch }),
        saveWhitelist: addresses => methods['mail-gateway/saveWhitelist'].invoke(ctx.remote, { addresses }),
        testConnection: patch => methods['mail-gateway/testConnection'].invoke(ctx.remote, { patch }),
        status: () => methods['mail-gateway/status'].invoke(ctx.remote, {}),
    };
}
