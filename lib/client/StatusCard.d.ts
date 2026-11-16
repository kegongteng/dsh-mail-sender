import type { ConnectionTestResult, MailStatus } from '../types.js';
export interface StatusCardProps {
    status?: MailStatus;
    allowedCount: number;
    test?: ConnectionTestResult;
}
/** 纯展示：状态由 MailGatewaySection 统一拉取，这里不发起任何请求。 */
export declare function StatusCard({ status, allowedCount, test }: StatusCardProps): import("react").JSX.Element;
