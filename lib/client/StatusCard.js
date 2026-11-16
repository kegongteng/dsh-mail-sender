import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const card = {
    border: '1px solid var(--dsh-border, #e5e7eb)',
    borderRadius: 8,
    padding: '12px 14px',
    display: 'grid',
    gap: 6,
    fontSize: 13,
    lineHeight: 1.6,
};
function summary(status) {
    switch (status?.phase) {
        case 'connecting':
            return { text: '正在连接…', color: '#6b7280' };
        case 'idle':
            return { text: '已连接，服务器支持 IDLE，新邮件会即时唤醒。', color: '#047857' };
        case 'polling':
            return {
                text: '已连接，服务器不支持 IDLE，自动改为轮询 60s，延迟最长约 1 分钟。',
                color: '#b45309',
            };
        case 'error':
            return { text: `连接失败：${status.lastError ?? '未知原因'}`, color: '#b91c1c' };
        default:
            return { text: '未启用：请先填写完整的邮箱绑定信息。', color: '#6b7280' };
    }
}
/** 纯展示：状态由 MailGatewaySection 统一拉取，这里不发起任何请求。 */
export function StatusCard({ status, allowedCount, test }) {
    const state = summary(status);
    return (_jsxs("div", { style: card, children: [_jsx("div", { style: { color: state.color, fontWeight: 600 }, children: state.text }), status?.phase === 'idle' || status?.phase === 'polling' ? (_jsxs("div", { style: { color: '#6b7280' }, children: ["\u6536\u4FE1\u7B56\u7565\uFF1A", allowedCount > 0 ? `仅接收白名单内 ${allowedCount} 个地址的邮件。` : '白名单为空，不会接收任何邮件。', status.since ? ` 连接建立于 ${new Date(status.since).toLocaleString()}。` : ''] })) : null, allowedCount === 0 && status?.phase !== 'idle' && status?.phase !== 'polling' ? (_jsx("div", { style: { color: '#b45309' }, children: "\u767D\u540D\u5355\u4E3A\u7A7A\uFF1A\u4E0D\u4F1A\u63A5\u6536\u4EFB\u4F55\u90AE\u4EF6\u3002" })) : null, test ? (_jsx("div", { style: { color: test.ok ? '#047857' : '#b91c1c' }, children: test.ok
                    ? test.supportsIdle
                        ? '测试连接成功：服务器支持 IDLE。'
                        : '测试连接成功：服务器不支持 IDLE，将使用轮询。'
                    : `测试连接失败：${test.error ?? '未知原因'}` })) : null] }));
}
