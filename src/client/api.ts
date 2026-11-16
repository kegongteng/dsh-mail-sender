import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '../remote.js'
import type {
  ConnectionTestResult,
  MailSnapshot,
  MailStatus,
  MailboxPatch,
} from '../types.js'

/** 设置页使用的全部宿主能力；组件只依赖这个接口。 */
export interface MailGatewayApi {
  get(): Promise<RemoteResult<MailSnapshot>>
  saveMailbox(patch: MailboxPatch): Promise<RemoteResult<MailSnapshot>>
  saveWhitelist(addresses: string[]): Promise<RemoteResult<MailSnapshot>>
  testConnection(patch: MailboxPatch): Promise<RemoteResult<ConnectionTestResult>>
  status(): Promise<RemoteResult<MailStatus>>
}

export function createApi(ctx: Context): MailGatewayApi {
  const remote = ctx.remote['mail-gateway']
  return {
    get: () => remote.get(),
    saveMailbox: patch => remote.saveMailbox(patch),
    saveWhitelist: addresses => remote.saveWhitelist(addresses),
    testConnection: patch => remote.testConnection(patch),
    status: () => remote.status(),
  }
}
