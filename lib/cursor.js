import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
function cursorPath(account) {
    const digest = createHash('sha1').update(account).digest('hex').slice(0, 16);
    return join(homedir(), '.dsh', 'mail-gateway', `${digest}.json`);
}
/** UID 游标持久化；读写失败时退化为内存游标，不阻塞收信。 */
export class CursorStore {
    file;
    cache;
    constructor(account) {
        this.file = cursorPath(account);
    }
    async read() {
        if (this.cache)
            return this.cache;
        try {
            const raw = await readFile(this.file, 'utf8');
            const parsed = JSON.parse(raw);
            if (typeof parsed.uidValidity === 'string' && typeof parsed.uid === 'number') {
                this.cache = { uidValidity: parsed.uidValidity, uid: parsed.uid };
                return this.cache;
            }
        }
        catch { }
        return undefined;
    }
    async write(record) {
        this.cache = record;
        try {
            await mkdir(dirname(this.file), { recursive: true });
            await writeFile(this.file, JSON.stringify(record), 'utf8');
        }
        catch { }
    }
}
