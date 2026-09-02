export interface ProjectionTokenUsage {
  readonly uncachedInputTokens: number
  readonly cacheReadTokens: number
  readonly outputTokens: number
}

export interface PowerWorkbenchTurnUsageView {
  readonly turn: number | null
  readonly provider: string | null
  readonly model: string | null
  readonly usage: ProjectionTokenUsage
}

interface RequestIdentity {
  readonly provider: string | null
  readonly model: string | null
}

interface TurnUsageProjectionState {
  readonly header: RequestIdentity
  readonly latest: PowerWorkbenchTurnUsageView & { readonly steps: Readonly<Record<string, ProjectionTokenUsage>> }
}

interface ProjectionSchema<T> { parse(value: unknown): T }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function tokenCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function identityOf(value: unknown): RequestIdentity {
  if (!isRecord(value)) return { provider: null, model: null }
  return { provider: nullableText(value.provider), model: nullableText(value.model) }
}

function usageOf(value: unknown): ProjectionTokenUsage {
  const record = isRecord(value) ? value : {}
  return {
    // Durable logs name this field inputTokens, while the live projection
    // transport already normalizes it to uncachedInputTokens.
    uncachedInputTokens: tokenCount(record.uncachedInputTokens) || tokenCount(record.inputTokens),
    cacheReadTokens: tokenCount(record.cacheReadTokens),
    outputTokens: tokenCount(record.outputTokens),
  }
}

function sumUsage(steps: Readonly<Record<string, ProjectionTokenUsage>>): ProjectionTokenUsage {
  return Object.values(steps).reduce<ProjectionTokenUsage>((total, usage) => ({
    uncachedInputTokens: total.uncachedInputTokens + usage.uncachedInputTokens,
    cacheReadTokens: total.cacheReadTokens + usage.cacheReadTokens,
    outputTokens: total.outputTokens + usage.outputTokens,
  }), { uncachedInputTokens: 0, cacheReadTokens: 0, outputTokens: 0 })
}

function parseState(value: unknown): TurnUsageProjectionState {
  if (!isRecord(value) || !isRecord(value.latest)) throw new Error('usageExportTurnUsage: invalid cached state')
  const latest = value.latest
  const turn = latest.turn === null ? null : tokenCount(latest.turn)
  if (latest.turn !== null && turn === 0 && latest.turn !== 0) throw new Error('usageExportTurnUsage: invalid turn')
  if (!isRecord(latest.steps)) throw new Error('usageExportTurnUsage: invalid step usage')
  const steps = Object.fromEntries(Object.entries(latest.steps).map(([step, usage]) => [step, usageOf(usage)]))
  return {
    header: identityOf(value.header),
    latest: { turn, ...identityOf(latest), usage: sumUsage(steps), steps },
  }
}

function parseView(value: unknown): PowerWorkbenchTurnUsageView {
  if (!isRecord(value)) throw new Error('usageExportTurnUsage: invalid client view')
  const turn = value.turn === null ? null : tokenCount(value.turn)
  if (value.turn !== null && turn === 0 && value.turn !== 0) throw new Error('usageExportTurnUsage: invalid client turn')
  return { turn, ...identityOf(value), usage: usageOf(value.usage) }
}

function sameIdentity(left: RequestIdentity, right: RequestIdentity): boolean {
  return left.provider === right.provider && left.model === right.model
}

function headerFrom(event: unknown): RequestIdentity | null {
  if (!isRecord(event) || event.type !== 'request/header' || !isRecord(event.data) || !isRecord(event.data.header) || !isRecord(event.data.header.config)) return null
  const identity = identityOf(event.data.header.config)
  return identity.provider === null && identity.model === null ? null : identity
}

function usageSampleFrom(event: unknown): { readonly turn: number, readonly step: number, readonly usage: ProjectionTokenUsage } | null {
  if (!isRecord(event) || !isRecord(event.data)) return null
  const data = event.data
  if ((event.type !== 'assistant/chunk' && event.type !== 'assistant/message') || typeof data.turn !== 'number' || !Number.isSafeInteger(data.turn) || data.turn < 0 || typeof data.step !== 'number' || !Number.isSafeInteger(data.step) || data.step < 0) return null
  const rawUsage = event.type === 'assistant/chunk' && isRecord(data.chunk) && data.chunk.type === 'usage'
    ? data.chunk.usage
    : event.type === 'assistant/message' ? data.usage : undefined
  if (!isRecord(rawUsage)) return null
  return { turn: data.turn, step: data.step, usage: usageOf(rawUsage) }
}

export const EMPTY_TURN_USAGE: PowerWorkbenchTurnUsageView = {
  turn: null,
  provider: null,
  model: null,
  usage: { uncachedInputTokens: 0, cacheReadTokens: 0, outputTokens: 0 },
}

export function applyTurnUsage(state: TurnUsageProjectionState, event: unknown): TurnUsageProjectionState {
  const header = headerFrom(event)
  if (header !== null) return sameIdentity(state.header, header) ? state : { ...state, header }
  const sample = usageSampleFrom(event)
  if (sample === null || (state.latest.turn !== null && sample.turn < state.latest.turn)) return state
  const priorSteps = state.latest.turn === sample.turn ? state.latest.steps : {}
  const nextSteps = { ...priorSteps, [String(sample.step)]: sample.usage }
  const latest = { turn: sample.turn, ...state.header, usage: sumUsage(nextSteps), steps: nextSteps }
  return { ...state, latest }
}

export function initialTurnUsageState(): TurnUsageProjectionState {
  return { header: { provider: null, model: null }, latest: { ...EMPTY_TURN_USAGE, steps: {} } }
}

/** DSH drives this pure fold from durable events and serves the view to the browser. */
export const turnUsageProjectionDefinition = {
  key: 'usageExportTurnUsage',
  stateVersion: 1,
  stateSchema: { parse: parseState } satisfies ProjectionSchema<TurnUsageProjectionState>,
  init: initialTurnUsageState,
  apply: applyTurnUsage,
  wire: {
    viewSchema: { parse: parseView } satisfies ProjectionSchema<PowerWorkbenchTurnUsageView>,
    view: (state: TurnUsageProjectionState): PowerWorkbenchTurnUsageView => ({
      turn: state.latest.turn,
      provider: state.latest.provider,
      model: state.latest.model,
      usage: state.latest.usage,
    }),
  },
}
