import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { StatusCard } from './StatusCard.js';
const table = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
};
const cell = {
    borderBottom: '1px solid var(--dsh-border, #e5e7eb)',
    padding: '8px 10px',
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
const section = { display: 'grid', gap: 16, maxWidth: 760 };
const row = { display: 'flex', gap: 8, alignItems: 'center' };
export function MailGatewaySection({ api }) {
    const [snapshot, setSnapshot] = useState();
    const [mailbox, setMailbox] = useState();
    const [password, setPassword] = useState('');
    const [allowed, setAllowed] = useState([]);
    const [entry, setEntry] = useState('');
    const [test, setTest] = useState();
    const [busy, setBusy] = useState(null);
    const [notice, setNotice] = useState();
    const applySnapshot = (next, resetMailbox) => {
        setSnapshot(next);
        setAllowed([...next.allowedAddresses]);
        if (resetMailbox) {
            setMailbox({ ...next.mailbox });
            setPassword('');
        }
    };
    useEffect(() => {
        let alive = true;
        void api.get().then(result => {
            if (!alive)
                return;
            if (result.ok)
                applySnapshot(result.value, true);
            else
                setNotice({ kind: 'error', text: result.error.message });
        });
        return () => {
            alive = false;
        };
    }, [api]);
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
            setNotice({ kind: 'ok', text: '邮箱绑定已保存，连接已按新配置重建。' });
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
            setNotice({ kind: 'ok', text: '白名单已保存，收信策略立即生效，连接保持不变。' });
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
    return (_jsxs("div", { style: section, children: [_jsx(StatusCard, { status: snapshot?.status, allowedCount: allowed.length, test: test }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 15 }, children: "\u90AE\u7BB1\u7ED1\u5B9A" }), _jsxs("table", { style: table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { ...cell, ...muted, width: 140 }, children: "\u5B57\u6BB5" }), _jsx("th", { style: { ...cell, ...muted }, children: "\u503C" }), _jsx("th", { style: { ...cell, ...muted, width: 240 }, children: "\u8BF4\u660E" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { style: cell, children: "\u90AE\u7BB1\u5730\u5740" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.email ?? '', onChange: textField('email') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u63A5\u6536\u90AE\u4EF6\u4E0E\u56DE\u4FE1\u4F7F\u7528\u7684\u5730\u5740\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "\u663E\u793A\u540D" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.displayName ?? '', onChange: textField('displayName') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u56DE\u4FE1\u65F6\u7684\u53D1\u4EF6\u4EBA\u540D\u79F0\uFF0C\u53EF\u7559\u7A7A\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "IMAP \u4E3B\u673A" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.imapHost ?? '', onChange: textField('imapHost') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u6807\u51C6 IMAP \u670D\u52A1\u5668\u5730\u5740\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "IMAP \u7AEF\u53E3" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.imapPort ?? 993, onChange: numberField('imapPort') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "SSL \u4E00\u822C\u4E3A 993\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "IMAP TLS" }), _jsx("td", { style: cell, children: _jsx("input", { type: "checkbox", checked: mailbox?.imapSecure ?? true, onChange: boolField('imapSecure') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u52FE\u9009\u8868\u793A\u4F7F\u7528 SSL/TLS\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "SMTP \u4E3B\u673A" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.smtpHost ?? '', onChange: textField('smtpHost') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u6807\u51C6 SMTP \u670D\u52A1\u5668\u5730\u5740\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "SMTP \u7AEF\u53E3" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.smtpPort ?? 465, onChange: numberField('smtpPort') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "SSL \u4E00\u822C\u4E3A 465\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "SMTP TLS" }), _jsx("td", { style: cell, children: _jsx("input", { type: "checkbox", checked: mailbox?.smtpSecure ?? true, onChange: boolField('smtpSecure') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u52FE\u9009\u8868\u793A\u4F7F\u7528 SSL/TLS\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "\u767B\u5F55\u7528\u6237\u540D" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, value: mailbox?.username ?? '', onChange: textField('username') }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u7559\u7A7A\u65F6\u4F7F\u7528\u90AE\u7BB1\u5730\u5740\u3002" })] }), _jsxs("tr", { children: [_jsx("td", { style: cell, children: "\u5BC6\u7801" }), _jsx("td", { style: cell, children: _jsx("input", { style: input, type: "password", value: password, placeholder: snapshot?.passwordSet ? '已设置，留空表示不修改' : '未设置', onChange: event => setPassword(event.target.value) }) }), _jsx("td", { style: { ...cell, ...muted }, children: "\u4FDD\u5B58\u540E\u53EA\u663E\u793A\u201C\u5DF2\u8BBE\u7F6E\u201D\uFF0C\u4E0D\u4F1A\u56DE\u663E\u660E\u6587\u3002" })] })] })] }), _jsxs("div", { style: { ...row, marginTop: 10 }, children: [_jsx("button", { style: primary, disabled: busy !== null, onClick: () => void saveMailbox(), children: busy === 'mailbox' ? '保存中…' : '保存邮箱绑定' }), _jsx("button", { style: button, disabled: busy !== null, onClick: () => void testConnection(), children: busy === 'test' ? '测试中…' : '测试连接' }), _jsx("span", { style: muted, children: "\u4FDD\u5B58\u90AE\u7BB1\u7ED1\u5B9A\u65F6\u4F1A\u6309\u65B0\u914D\u7F6E\u91CD\u5EFA\u8FDE\u63A5\u3002" })] })] }), _jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 15 }, children: "\u767D\u540D\u5355" }), _jsxs("div", { style: { ...row, marginBottom: 8 }, children: [_jsx("input", { style: { ...input, maxWidth: 320 }, value: entry, placeholder: "\u8F93\u5165\u90AE\u7BB1\u5730\u5740\u540E\u56DE\u8F66\u6DFB\u52A0", onChange: event => setEntry(event.target.value), onKeyDown: onEntryKey }), _jsx("button", { style: button, onClick: addAddress, children: "\u6DFB\u52A0" })] }), _jsx("table", { style: table, children: _jsx("tbody", { children: allowed.length === 0 ? (_jsx("tr", { children: _jsx("td", { style: { ...cell, ...muted }, children: "\u6682\u65E0\u5730\u5740\uFF0C\u767D\u540D\u5355\u4E3A\u7A7A\u65F6\u4E0D\u4F1A\u63A5\u6536\u4EFB\u4F55\u90AE\u4EF6\u3002" }) })) : (allowed.map(address => (_jsxs("tr", { children: [_jsx("td", { style: cell, children: address }), _jsx("td", { style: { ...cell, width: 80, textAlign: 'right' }, children: _jsx("button", { style: button, onClick: () => removeAddress(address), children: "\u5220\u9664" }) })] }, address)))) }) }), _jsxs("div", { style: { ...row, marginTop: 10 }, children: [_jsx("button", { style: primary, disabled: busy !== null, onClick: () => void saveWhitelist(), children: busy === 'whitelist' ? '保存中…' : '保存白名单' }), _jsx("span", { style: muted, children: "\u540C\u4E00\u4EFD\u767D\u540D\u5355\u540C\u65F6\u6821\u9A8C\u5165\u7AD9\u53D1\u4EF6\u5730\u5740\u4E0E\u51FA\u7AD9\u56DE\u590D\u5730\u5740\u3002" })] })] }), notice ? (_jsx("div", { style: { color: notice.kind === 'ok' ? '#047857' : '#b91c1c', fontSize: 13 }, children: notice.text })) : null] }));
}
