import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '../remote.js'
import TYPERT_REMOTE from '../remote.js'
import { createApi } from './api.js'
import { MailGatewaySection } from './MailGatewaySection.js'

export const name = 'dsh-mail-sender'
export const inject = ['slots', 'remote']

/**
 * 先挂载本插件的 Remote 命名空间，再交给一个声明了 `remote.mail-gateway` 的子插件
 * 注册设置页分区。命名空间服务由 `$mount` 提供，若在同一个 fiber 的 `inject` 里声明
 * 它会因为“依赖自己提供”而永久等待激活。
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)

  ctx.plugin({
    name: 'dsh-mail-sender/ui',
    inject: ['slots', 'remote.mail-gateway'],
    apply(ui: Context): void {
      const api = createApi(ui)
      ui.slots.inject('settings.section', () =>
        ui.slots.register(
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
    },
  })

  return disposeRemote
}
