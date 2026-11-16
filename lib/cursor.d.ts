export interface CursorRecord {
    /** IMAP UIDVALIDITY，变化表示邮箱被重建，需要重新建基线。 */
    uidValidity: string;
    /** 已处理到的最大 UID。 */
    uid: number;
}
/** UID 游标持久化；读写失败时退化为内存游标，不阻塞收信。 */
export declare class CursorStore {
    private readonly file;
    private cache?;
    constructor(account: string);
    read(): Promise<CursorRecord | undefined>;
    write(record: CursorRecord): Promise<void>;
}
