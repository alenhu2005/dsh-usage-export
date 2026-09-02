import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { installStatsLineLayout } from './stats-layout.ts'
import { adoptStyles } from './styles.ts'
import { SessionUsageExportDock, type SessionUsageExportDockProps } from './view.tsx'

export const inject = ['slots']

type SlotBridge = {
  inject(name: string, effect: () => unknown): void
  register(definition: unknown, component: unknown): unknown
}

export function apply(ctx: ClientContext): void {
  adoptStyles()
  ctx.effect(() => installStatsLineLayout(), 'usage-export: expanded statistics')
  const slots = ctx.slots as unknown as SlotBridge
  slots.inject('conversation.composer.dock', () => slots.register({
    name: 'conversation.composer.dock', id: 'usage-export-utilities', order: 10,
    inject: () => ({}),
  }, (props: SessionUsageExportDockProps) => <SessionUsageExportDock {...props} />))
}
