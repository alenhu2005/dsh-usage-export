import { describe, expect, it } from 'vitest'
import { applyTurnUsage, initialTurnUsageState, turnUsageProjectionDefinition } from '../src/turn-usage-projection.ts'

describe('latest-turn usage projection', () => {
  it('replaces partial samples and sums every step in only the newest turn', () => {
    const events = [
      { type: 'request/header', data: { header: { config: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } } } },
      { type: 'assistant/chunk', data: { turn: 4, step: 1, chunk: { type: 'usage', usage: { inputTokens: 1, cacheReadTokens: 2, outputTokens: 3 } } } },
      { type: 'assistant/message', data: { turn: 4, step: 1, usage: { inputTokens: 10, cacheReadTokens: 20, outputTokens: 30 } } },
      { type: 'assistant/message', data: { turn: 4, step: 2, usage: { inputTokens: 4, cacheReadTokens: 5, outputTokens: 6 } } },
    ]
    const state = events.reduce(applyTurnUsage, initialTurnUsageState())
    expect(turnUsageProjectionDefinition.wire.view(state)).toEqual({
      turn: 4,
      provider: 'deepseek-official',
      model: 'deepseek-v4-pro',
      usage: { uncachedInputTokens: 14, cacheReadTokens: 25, outputTokens: 36 },
    })
  })

  it('resets accounting when the next user turn begins and validates cached state', () => {
    const first = applyTurnUsage(initialTurnUsageState(), { type: 'assistant/message', data: { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 10 } } })
    const second = applyTurnUsage(first, { type: 'assistant/message', data: { turn: 2, step: 1, usage: { inputTokens: 20, outputTokens: 2 } } })
    expect(turnUsageProjectionDefinition.wire.view(second).usage).toEqual({ uncachedInputTokens: 20, cacheReadTokens: 0, outputTokens: 2 })
    expect(() => turnUsageProjectionDefinition.stateSchema.parse({ latest: { turn: 'nope', steps: {} } })).toThrow('invalid turn')
  })

  it('accepts the normalized live input-token field', () => {
    const state = applyTurnUsage(initialTurnUsageState(), {
      type: 'assistant/message',
      data: { turn: 1, step: 1, usage: { uncachedInputTokens: 12, cacheReadTokens: 3, outputTokens: 4 } },
    })

    expect(turnUsageProjectionDefinition.wire.view(state).usage).toEqual({ uncachedInputTokens: 12, cacheReadTokens: 3, outputTokens: 4 })
  })
})
