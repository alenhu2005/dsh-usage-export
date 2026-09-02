export type PricedModel = 'flash' | 'pro' | 'flash-vision'
export type PricePeriod = 'peak' | 'offpeak'

export interface CostSettings {
  readonly fallbackModel: PricedModel
  readonly twdPerCny: number
}

export interface TokenUsage {
  readonly uncachedInputTokens: number
  readonly cacheReadTokens: number
  readonly outputTokens: number
}

export interface ConversationNodeLite {
  readonly kind?: unknown
  readonly turn?: unknown
  readonly usage?: unknown
  readonly requestConfig?: unknown
  readonly provenance?: unknown
}

export interface TurnUsage {
  readonly usage: TokenUsage
  readonly model: string | null
  readonly provider: string | null
}

export const DEFAULT_COST_SETTINGS: CostSettings = {
  fallbackModel: 'pro',
  twdPerCny: 4.6,
}

const pricedModels: readonly PricedModel[] = ['flash', 'pro', 'flash-vision']
const MILLION = 1_000_000
export const PEAK_HOURS_LABEL = '平日 09:00–12:00、14:00–18:00（台灣時間）'

const PRICES: Record<PricedModel, Record<PricePeriod, { readonly cache: number, readonly input: number, readonly output: number }>> = {
  flash: {
    peak: { cache: 0.1, input: 3, output: 9 },
    offpeak: { cache: 0.05, input: 1.5, output: 4.5 },
  },
  pro: {
    peak: { cache: 0.3, input: 9, output: 27 },
    offpeak: { cache: 0.15, input: 4.5, output: 13.5 },
  },
  'flash-vision': {
    peak: { cache: 0.1, input: 3, output: 9 },
    offpeak: { cache: 0.05, input: 1.5, output: 4.5 },
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function tokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function modelIdentity(node: ConversationNodeLite): { readonly model: string | null, readonly provider: string | null } {
  const request = isRecord(node.requestConfig) ? node.requestConfig : null
  const provenance = isRecord(node.provenance) ? node.provenance : null
  return {
    model: stringValue(request?.model) ?? stringValue(provenance?.model),
    provider: stringValue(request?.provider) ?? stringValue(provenance?.provider),
  }
}

export function sanitizeCostSettings(value: unknown): CostSettings {
  if (!isRecord(value)) return DEFAULT_COST_SETTINGS
  const fallbackModel = typeof value.fallbackModel === 'string' && pricedModels.includes(value.fallbackModel as PricedModel)
    ? value.fallbackModel as PricedModel
    : DEFAULT_COST_SETTINGS.fallbackModel
  const twdPerCny = typeof value.twdPerCny === 'number' && Number.isFinite(value.twdPerCny) && value.twdPerCny >= 1 && value.twdPerCny <= 10
    ? Math.round(value.twdPerCny * 100) / 100
    : DEFAULT_COST_SETTINGS.twdPerCny
  return { fallbackModel, twdPerCny }
}

export function loadCostSettings(storage: Pick<Storage, 'getItem'> | undefined): CostSettings {
  if (storage === undefined) return DEFAULT_COST_SETTINGS
  try {
    const raw = storage.getItem('dsh-usage-export/cost-settings')
    return raw === null ? DEFAULT_COST_SETTINGS : sanitizeCostSettings(JSON.parse(raw))
  } catch {
    return DEFAULT_COST_SETTINGS
  }
}

export function saveCostSettings(storage: Pick<Storage, 'setItem'> | undefined, settings: CostSettings): void {
  if (storage === undefined) return
  try { storage.setItem('dsh-usage-export/cost-settings', JSON.stringify(sanitizeCostSettings(settings))) } catch { /* local storage is optional */ }
}

export function usageFrom(value: unknown): TokenUsage | null {
  if (!isRecord(value)) return null
  const source = isRecord(value.totals) ? value.totals : value
  const usage = {
    uncachedInputTokens: tokenCount(source.uncachedInputTokens) || tokenCount(source.inputTokens),
    cacheReadTokens: tokenCount(source.cacheReadTokens),
    outputTokens: tokenCount(source.outputTokens),
  }
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.outputTokens > 0 ? usage : null
}

/** Read the workbench's replay-safe latest-turn projection when the host provides it. */
export function projectedTurnUsageFrom(value: unknown): TurnUsage | null {
  if (!isRecord(value)) return null
  const usage = usageFrom(value.usage)
  if (usage === null) return null
  return { usage, model: stringValue(value.model), provider: stringValue(value.provider) }
}

/** Summarise every completed model step belonging to the newest user turn. */
export function latestTurnUsage(nodes: readonly ConversationNodeLite[]): TurnUsage | null {
  const assistantNodes = nodes.filter((node) => node.kind === 'assistant' && typeof node.turn === 'number' && Number.isFinite(node.turn))
  if (assistantNodes.length === 0) return null
  const latestTurn = Math.max(...assistantNodes.map((node) => node.turn as number))
  const latest = assistantNodes.filter((node) => node.turn === latestTurn)
  let uncachedInputTokens = 0
  let cacheReadTokens = 0
  let outputTokens = 0
  for (const node of latest) {
    const usage = usageFrom(node.usage)
    if (usage === null) continue
    uncachedInputTokens += usage.uncachedInputTokens
    cacheReadTokens += usage.cacheReadTokens
    outputTokens += usage.outputTokens
  }
  if (uncachedInputTokens + cacheReadTokens + outputTokens === 0) return null
  const identity = latest.slice().reverse().map(modelIdentity).find((candidate) => candidate.model !== null || candidate.provider !== null) ?? { model: null, provider: null }
  return { usage: { uncachedInputTokens, cacheReadTokens, outputTokens }, ...identity }
}

export function modelFromName(value: string | null, fallback: PricedModel): PricedModel {
  const name = value?.toLowerCase() ?? ''
  if (name.includes('pro')) return 'pro'
  if (name.includes('vision')) return 'flash-vision'
  if (name.includes('flash')) return 'flash'
  return fallback
}

export function isDeepSeekProvider(provider: string | null): boolean {
  return provider === null || provider.toLowerCase().includes('deepseek')
}

/** Beijing and Taipei share UTC+8. Peak is weekdays 09:00–12:00 and 14:00–18:00. */
export function pricePeriodAt(date: Date): PricePeriod {
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const weekday = taipei.getUTCDay() >= 1 && taipei.getUTCDay() <= 5
  const hour = taipei.getUTCHours()
  return weekday && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)) ? 'peak' : 'offpeak'
}

export function estimateCny(usage: TokenUsage, model: PricedModel, period: PricePeriod): number {
  const rate = PRICES[model][period]
  return (usage.uncachedInputTokens * rate.input + usage.cacheReadTokens * rate.cache + usage.outputTokens * rate.output) / MILLION
}

export function estimateTwd(usage: TokenUsage, model: PricedModel, period: PricePeriod, twdPerCny: number): number {
  return estimateCny(usage, model, period) * twdPerCny
}

export function formatTwd(value: number): string {
  return `NT$${new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

export function modelLabel(model: PricedModel): string {
  return model === 'pro' ? 'V4 Pro' : model === 'flash-vision' ? 'V4 Flash Vision' : 'V4 Flash'
}
