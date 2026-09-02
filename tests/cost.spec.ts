import { describe, expect, it } from 'vitest'
import { estimateCny, estimateTwd, formatTwd, latestTurnUsage, modelFromName, PEAK_HOURS_LABEL, pricePeriodAt, projectedTurnUsageFrom, sanitizeCostSettings, usageFrom, type ConversationNodeLite } from '../src/client/cost.ts'

describe('cost estimation', () => {
  it('uses disjoint cache, input, and output price buckets for the latest turn', () => {
    const nodes: readonly ConversationNodeLite[] = [
      { kind: 'assistant', turn: 3, usage: { inputTokens: 999, outputTokens: 999 } },
      { kind: 'assistant', turn: 4, usage: { inputTokens: 100_000, cacheReadTokens: 400_000, outputTokens: 10_000 }, requestConfig: { provider: 'deepseek', model: 'deepseek-v4-flash' } },
      { kind: 'assistant', turn: 4, usage: { inputTokens: 10_000, outputTokens: 1_000 } },
    ]
    const latest = latestTurnUsage(nodes)
    expect(latest?.usage).toEqual({ uncachedInputTokens: 110_000, cacheReadTokens: 400_000, outputTokens: 11_000 })
    expect(latest?.model).toBe('deepseek-v4-flash')
    expect(estimateCny(latest!.usage, 'flash', 'peak')).toBeCloseTo(0.469, 8)
    expect(estimateTwd(latest!.usage, 'flash', 'peak', 4.6)).toBeCloseTo(2.1574, 8)
    expect(formatTwd(2.1574)).toBe('NT$2.16')
  })

  it('selects peak time in Taipei and safely sanitizes local settings', () => {
    expect(PEAK_HOURS_LABEL).toBe('平日 09:00–12:00、14:00–18:00（台灣時間）')
    expect(pricePeriodAt(new Date('2026-09-01T02:00:00.000Z'))).toBe('peak')
    expect(pricePeriodAt(new Date('2026-09-05T12:00:00.000Z'))).toBe('offpeak')
    expect(modelFromName('deepseek-v4-pro', 'flash')).toBe('pro')
    expect(sanitizeCostSettings({ fallbackModel: 'pro', twdPerCny: 4.61 })).toEqual({ fallbackModel: 'pro', twdPerCny: 4.61 })
    expect(sanitizeCostSettings({ fallbackModel: 'unknown', twdPerCny: 99 })).toEqual({ fallbackModel: 'pro', twdPerCny: 4.6 })
  })

  it('keeps native cumulative usage separate from the replayed current-turn projection', () => {
    expect(usageFrom({ totals: { uncachedInputTokens: 30, cacheReadTokens: 20, outputTokens: 10 } })).toEqual({ uncachedInputTokens: 30, cacheReadTokens: 20, outputTokens: 10 })
    expect(projectedTurnUsageFrom({ provider: 'deepseek-official', model: 'deepseek-v4-pro', usage: { uncachedInputTokens: 8, cacheReadTokens: 6, outputTokens: 4 } })).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro', usage: { uncachedInputTokens: 8, cacheReadTokens: 6, outputTokens: 4 } })
  })
})
