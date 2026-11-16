import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { StatusCard } from './StatusCard.js';
const table = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
};
const cell = {
    borderBottom: '1px solid var(--dsh-border, #e5e7eb)',
    padding: '6px 8px',
    verticalAlign: 'middle',
    textAlign: 'left',
};
const input = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    border: '1px solid var(--dsh-border, #d1d5db)',
    borderRadius: 6,
    background: 'transparent',
    color: 'inherit',
    fontSize: 13,
};
const button = {
    padding: '6px 12px',
    border: '1px solid var(--dsh-border, #d1d5db)',
    borderRadius: 6,
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 13,
};
const primary = {
    ...button,
    borderColor: '#2563eb',
    background: '#2563eb',
    color: '#fff',
};
const muted = { color: '#6b7280', fontSize: 12 };
const section = { display: 'grid', gap: 16, maxWidth: 640 };
const row = { display: 'flex', gap: 8, alignItems: 'center' };
const logBox = {
    margin: 0,
    padding: '8px 10px',
    maxHeight: 220,
    overflow: 'auto',
    border: '1px solid var(--dsh-border, #e5e7eb)',
    borderRadius: 6,
    background: 'var(--dsh-code-bg, rgba(127,127,127,0.08))',
    fontSize: 12,
    lineHeight: 1.6,
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
};
export function MailGatewaySection({ api }) {
    const [snapshot, setSnapshot] = useState();
    const [mailbox, setMailbox] = useState();
    const [password, setPassword] = useState('');
    const [allowed, setAllowed] = useState([]);
    const [entry, setEntry] = useState('');
    const [test, setTest] = useState();
    const [busy, setBusy] = useState(null);
    const [notice, setNotice] = useState();
    const logRef = useRef(null);
    // 首次读取填充表单；之后每 3 秒只刷新状态与日志，不覆盖正在编辑的表单。
    useEffect(() => {
        let alive = true;
        const load = async (initial) => {
            const result = await api.get();
            if (!alive)
                return;
            if (!result.ok) {
                if (initial)
                    setNotice({ kind: 'error', text: result.error.message });
                return;
            }
            setSnapshot(result.value);
            if (initial) {
                setMailbox({ ...result.value.mailbox });
                setAllowed([...result.value.allowedAddresses]);
                setPassword('');
            }
        };
        void load(true);
        const timer = setInterval(() => void load(false), 3000);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [api]);
    useEffect(() => {
        const box = logRef.current;
        if (box)
            box.scrollTop = box.scrollHeight;
    }, [snapshot?.logs]);
    const applySnapshot = (next, resetMailbox) => {
        setSnapshot(next);
        setAllowed([...next.allowedAddresses]);
        if (resetMailbox) {
            setMailbox({ ...next.mailbox });
            setPassword('');
        }
    };
    const setField = (key, value) => {
        setMailbox(current => (current ? { ...current, [key]: value } : current));
    };
    const patch = (source) => ({
        ...source,
        password: password ? password : undefined,
    });
    const saveMailbox = async () => {
        if (!mailbox)
            return;
        setBusy('mailbox');
        setNotice(undefined);
        const result = await api.saveMailbox(patch(mailbox));
        setBusy(null);
        if (result.ok) {
            applySnapshot(result.value, true);
            setTest(undefined);
            setNotice({ kind: 'ok', text: '已保存，按新配置重连。' });
        }
        else {
            setNotice({ kind: 'error', text: result.error.message });
        }
    };
    const testConnection = async () => {
        if (!mailbox)
            return;
        setBusy('test');
        setNotice(undefined);
        const result = await api.testConnection(patch(mailbox));
        setBusy(null);
        if (result.ok) {
            setTest(result.value);
        }
        else {
            setNotice({ kind: 'error', text: result.error.message });
        }
    };
    const addAddress = () => {
        const address = entry.trim().toLowerCase();
        if (!address)
            return;
        setAllowed(current => (current.includes(address) ? current : [...current, address]));
        setEntry('');
    };
    const onEntryKey = (event) => {
        if (event.key !== 'Enter')
            return;
        event.preventDefault();
        addAddress();
    };
    const removeAddress = (address) => {
        setAllowed(current => current.filter(item => item !== address));
    };
    const saveWhitelist = async () => {
        setBusy('whitelist');
        setNotice(undefined);
        const result = await api.saveWhitelist(allowed);
        setBusy(null);
        if (result.ok) {
            applySnapshot(result.value, false);
            setNotice({ kind: 'ok', text: '白名单已保存。' });
        }
        else {
            setNotice({ kind: 'error', text: result.error.message });
        }
    };
    const numberField = (key) => (event) => {
        setField(key, Number(event.target.value) || 0);
    };
    const textField = (key) => (event) => {
        setField(key, event.target.value);
    };
    const boolField = (key) => (event) => {
        setField(key, event.target.checked);
    };
    const textRow = (label, key) => (_jsxs("tr", { children: [_jsx("td", { style: { ...cell, width: 110 }, children: label }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.[key] ?? '', onChange: textField(key) }) })] }));
    const portRow = (label, key) => (_jsxs("tr", { children: [_jsx("td", { style: { ...cell, width: 110 }, children: label }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.[key] ?? 0, onChange: numberField(key) }) })] }));
    const tlsRow = (label, key) => (_jsxs("tr", { children: [_jsx("td", { style: { ...cell, width: 110 }, children: label }), _jsx("td", { style: cell, children: _jsx("input", { type: "checkbox", checked: mailbox?.[key] ?? true, onChange: boolField(key) }) })] }));
    return (_jsxs("div", { style: section, children: [_jsx(StatusCard, { status: snapshot?.status, allowedCount: allowed.length, test: test }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 15 }, children: "\u90AE\u7BB1\u7ED1\u5B9A" }), _jsx("table", { style: table, children: _jsxs("tbody", { children: [textRow('邮箱地址', 'email'), textRow('显示名', 'displayName'), textRow('IMAP 主机', 'imapHost'), portRow('IMAP 端口', 'imapPort'), tlsRow('IMAP TLS', 'imapSecure'), textRow('SMTP 主机', 'smtpHost'), portRow('SMTP 端口', 'smtpPort'), tlsRow('SMTP TLS', 'smtpSecure'), textRow('登录用户名', 'username'), _jsxs("tr", { children: [_jsx("td", { style: { ...cell, width: 110 }, children: "\u5BC6\u7801" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, type: "password", value: password, placeholder: snapshot?.passwordSet ? '已设置，留空表示不修改' : '未设置', onChange: event => setPassword(event.target.value) }) })] })] }) }), _jsxs("div", { style: { ...row, marginTop: 10 }, children: [_jsx("button", { style: primary, disabled: busy !== null, onClick: () => void saveMailbox(), children: busy === 'mailbox' ? '保存中…' : '保存邮箱绑定' }), _jsx("button", { style: button, disabled: busy !== null, onClick: () => void testConnection(), children: busy === 'test' ? '测试中…' : '测试连接' })] })] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 15 }, children: "\u767D\u540D\u5355" }), _jsxs("div", { style: { ...row, marginBottom: 8 }, children: [_jsx("input", { style: { ...input, maxWidth: 320 }, value: entry, placeholder: "\u8F93\u5165\u90AE\u7BB1\u5730\u5740\u540E\u56DE\u8F66\u6DFB\u52A0", onChange: event => setEntry(event.target.value), onKeyDown: onEntryKey }), _jsx("button", { style: button, onClick: addAddress, children: "\u6DFB\u52A0" })] }), _jsx("table", { style: table, children: _jsx("tbody", { children: allowed.length === 0 ? (_jsx("tr", { children: _jsx("td", { style: { ...cell, ...muted }, children: "\u6682\u65E0\u5730\u5740\uFF0C\u767D\u540D\u5355\u4E3A\u7A7A\u65F6\u4E0D\u4F1A\u63A5\u6536\u4EFB\u4F55\u90AE\u4EF6\u3002" }) })) : (allowed.map(address => (_jsxs("tr", { children: [_jsx("td", { style: cell, children: address }), _jsx("td", { style: { ...cell, width: 80, textAlign: 'right' }, children: _jsx("button", { style: button, onClick: () => removeAddress(address), children: "\u5220\u9664" }) })] }, address)))) }) }), _jsx("div", { style: { ...row, marginTop: 10 }, children: _jsx("button", { style: primary, disabled: busy !== null, onClick: () => void saveWhitelist(), children: busy === 'whitelist' ? '保存中…' : '保存白名单' }) })] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 15 }, children: "\u8FD0\u884C\u65E5\u5FD7" }), _jsx("pre", { ref: logRef, style: logBox, children: snapshot?.logs?.length ? snapshot.logs.join('\n') : '暂无日志' })] }), notice ? (_jsx("div", { style: { color: notice.kind === 'ok' ? '#047857' : '#b91c1c', fontSize: 13 }, children: notice.text })) : null] }));
}
