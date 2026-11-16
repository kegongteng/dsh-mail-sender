var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { createMailbox, mergeMailbox } from './mailbox.js';
import { normalizeAddress } from './policy.js';
import { probeIdle } from './receiver.js';
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function validate(mailbox) {
    if (!mailbox.email)
        return '请填写邮箱地址';
    if (!mailbox.imapHost)
        return '请填写 IMAP 主机';
    if (!mailbox.smtpHost)
        return '请填写 SMTP 主机';
    if (!(mailbox.username || mailbox.email))
        return '请填写登录用户名';
    if (!mailbox.password)
        return '请填写密码';
    if (!Number.isInteger(mailbox.imapPort) || mailbox.imapPort <= 0)
        return 'IMAP 端口无效';
    if (!Number.isInteger(mailbox.smtpPort) || mailbox.smtpPort <= 0)
        return 'SMTP 端口无效';
    return undefined;
}
/** Remote 面：设置页的读写、测试与状态查询。 */
let MailGatewayService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _get_decorators;
    let _status_decorators;
    let _saveMailbox_decorators;
    let _saveWhitelist_decorators;
    let _testConnection_decorators;
    return class MailGatewayService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _get_decorators = [Remote('get')];
            _status_decorators = [Remote('status')];
            _saveMailbox_decorators = [Remote('saveMailbox')];
            _saveWhitelist_decorators = [Remote('saveWhitelist')];
            _testConnection_decorators = [Remote('testConnection')];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _saveMailbox_decorators, { kind: "method", name: "saveMailbox", static: false, private: false, access: { has: obj => "saveMailbox" in obj, get: obj => obj.saveMailbox }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _saveWhitelist_decorators, { kind: "method", name: "saveWhitelist", static: false, private: false, access: { has: obj => "saveWhitelist" in obj, get: obj => obj.saveWhitelist }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _testConnection_decorators, { kind: "method", name: "testConnection", static: false, private: false, access: { has: obj => "testConnection" in obj, get: obj => obj.testConnection }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        context = __runInitializers(this, _instanceExtraInitializers);
        gateway;
        config;
        defaultNamespace;
        static inject = ['settings'];
        namespace;
        constructor(context, gateway, config, defaultNamespace) {
            super(context, 'mailGateway', { namespace: 'mail-gateway' });
            this.context = context;
            this.gateway = gateway;
            this.config = config;
            this.defaultNamespace = defaultNamespace;
        }
        async get() {
            return this.gateway.snapshot();
        }
        async status() {
            return this.gateway.snapshot().status;
        }
        async saveMailbox(patch) {
            const current = createMailbox(this.config.mailbox.get());
            const next = mergeMailbox(current, patch);
            const invalid = validate(next);
            if (invalid)
                throw new RemoteError('gateway/bad-request', invalid, {});
            const ops = [];
            for (const field of [
                'email',
                'displayName',
                'imapHost',
                'imapPort',
                'imapSecure',
                'smtpHost',
                'smtpPort',
                'smtpSecure',
                'username',
            ]) {
                if (next[field] !== current[field])
                    ops.push({ op: 'set', path: ['mailbox', field], value: next[field] });
            }
            // 密码留空表示不修改，且绝不把已存密码回写到表单。
            if (next.password !== current.password) {
                ops.push({ op: 'set', path: ['mailbox', 'password'], value: next.password });
            }
            try {
                if (ops.length)
                    await this.context.settings.mutate(this.resolveNamespace(), ops);
            }
            catch (error) {
                throw new RemoteError('gateway/internal', messageOf(error), {});
            }
            this.gateway.reload(next, this.config.allowedAddresses.get() ?? []);
            return this.gateway.snapshot();
        }
        async saveWhitelist(addresses) {
            const normalized = [...new Set(addresses.map(normalizeAddress).filter(Boolean))];
            try {
                await this.context.settings.mutate(this.resolveNamespace(), [
                    { op: 'set', path: ['allowedAddresses'], value: normalized },
                ]);
            }
            catch (error) {
                throw new RemoteError('gateway/internal', messageOf(error), {});
            }
            // 只更新内存策略，不断开 IMAP 连接。
            this.gateway.updatePolicy(normalized);
            return this.gateway.snapshot();
        }
        async testConnection(patch) {
            const mailbox = mergeMailbox(createMailbox(this.config.mailbox.get()), patch);
            if (!mailbox.imapHost || !(mailbox.username || mailbox.email) || !mailbox.password) {
                return { ok: false, supportsIdle: false, error: '请先填写 IMAP 主机、用户名和密码' };
            }
            try {
                return { ok: true, supportsIdle: await probeIdle(mailbox) };
            }
            catch (error) {
                return { ok: false, supportsIdle: false, error: messageOf(error) };
            }
        }
        /** profile 里的实例 id 通常就是包名；回退用 schema 里的字段名定位。 */
        resolveNamespace() {
            if (this.namespace)
                return this.namespace;
            const descriptors = this.context.settings.describe();
            const own = descriptors.find(item => item.ns === this.defaultNamespace) ??
                descriptors.find(item => JSON.stringify(item.schema ?? '').includes('imapHost'));
            if (!own) {
                throw new RemoteError('gateway/bad-request', '未找到 dsh-mail-sender 的配置项', {});
            }
            this.namespace = own.ns;
            return own.ns;
        }
    };
})();
export { MailGatewayService };
