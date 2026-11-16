import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '../remote.js'
import TYPERT_REMOTE from '../remote.js'
import { createApi } from './api.js'
import { MailGatewaySection } from './MailGatewaySection.js'

export const name = 'dsh-mail-sender'
export const inject = ['slots', 'remote', 'remote.mail-gateway']

/** 挂载本插件的 Remote 命名空间，并在设置页注册“邮件网关”分区。 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)

  const api = createApi(ctx)
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'mail-gateway',
        order: 120,
        label: () => '邮件网关',
        inject: () => ({ api }),
      },
      MailGatewaySection,
    ),
  )

  return disposeRemote
}
