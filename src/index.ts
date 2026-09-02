import type { Context } from '@deepseek-ai/cordis'
import { turnUsageProjectionDefinition } from './turn-usage-projection.ts'

export const name = 'dsh-usage-export'
export const inject = ['sessionProjections']

/** Register a local, replay-safe view of the latest turn's token usage. */
export function apply(ctx: Context): void {
  const projections = ctx as unknown as { sessionProjections: { register(definition: unknown): () => void } }
  projections.sessionProjections.register(turnUsageProjectionDefinition)
}
