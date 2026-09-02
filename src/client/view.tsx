import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PRINT_FONT_SIZE, downloadTranscriptMarkdown, exportableMessages, MAX_PRINT_FONT_SIZE, MIN_PRINT_FONT_SIZE, openPdfPrint, sanitizePrintFontSize, selectExportMessages, type ExportNode, type ExportSelection, type ExportableMessage, type PrintFontSize } from './export.ts'
import { DEFAULT_COST_SETTINGS, estimateTwd, formatTwd, isDeepSeekProvider, latestTurnUsage, modelFromName, modelLabel, PEAK_HOURS_LABEL, pricePeriodAt, projectedTurnUsageFrom, usageFrom, type ConversationNodeLite, type PricePeriod, type PricedModel, type TokenUsage } from './cost.ts'

type ExportFormat = 'md' | 'pdf'
type SessionNode = ConversationNodeLite & ExportNode
interface SessionSnapshot { readonly chat: { readonly legacy: { readonly nodes: readonly SessionNode[] } } }
export interface SessionUsageExportDockProps {
  readonly useSession: <T>(selector: (state: SessionSnapshot) => T) => T
  readonly useProjection: (key: string) => unknown
}
interface ComposerBounds { readonly left: number, readonly width: number }

function useComposerBounds(): ComposerBounds | null {
  const [bounds, setBounds] = useState<ComposerBounds | null>(null)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return undefined
    const composer = document.querySelector('.uV2eYG_root')
    if (!(composer instanceof HTMLElement)) return undefined
    const update = () => {
      const rect = composer.getBoundingClientRect()
      const left = Math.max(12, rect.left)
      const width = Math.max(0, Math.min(rect.width, window.innerWidth - left))
      setBounds((prior) => prior?.left === left && prior.width === width ? prior : { left, width })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(composer)
    window.addEventListener('resize', update)
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [])
  return bounds
}

function ExportPicker({ format, messages, onClose, onFeedback }: { readonly format: ExportFormat, readonly messages: readonly ExportableMessage[], readonly onClose: () => void, readonly onFeedback: (message: string) => void }) {
  const [selection, setSelection] = useState<ExportSelection>(null)
  const [fontSize, setFontSize] = useState<PrintFontSize>(DEFAULT_PRINT_FONT_SIZE)
  const composerBounds = useComposerBounds()
  const selected = useMemo(() => selectExportMessages(messages, selection), [messages, selection])
  const exportSelected = () => {
    const success = format === 'md' ? downloadTranscriptMarkdown(selected) : openPdfPrint(selected, fontSize)
    onFeedback(success
      ? format === 'md' ? `已開始下載 ${selected.length} 條 Markdown。` : `已開啟 ${selected.length} 條內容的列印視窗；選擇「儲存為 PDF」即可。`
      : format === 'md' ? '無法建立 Markdown 下載。' : '列印視窗被封鎖；請允許此網站開啟視窗後再試。')
    if (success) onClose()
  }
  const pickerClass = composerBounds === null ? 'dsh-ue-export-picker' : 'dsh-ue-export-picker dsh-ue-export-picker--anchored'
  return <section className={pickerClass} style={composerBounds === null ? undefined : { left: composerBounds.left, width: composerBounds.width }} role="dialog" aria-label={`選擇要匯出的${format === 'md' ? ' Markdown' : ' PDF'}內容`}>
    <button className="dsh-ue-export-choice" type="button" aria-pressed={selection === 'all'} onClick={() => setSelection('all')}>全選</button>
    <button className="dsh-ue-export-choice" type="button" aria-pressed={selection === 'user'} onClick={() => setSelection('user')}>僅選用戶</button>
    <button className="dsh-ue-export-choice" type="button" aria-pressed={selection === 'assistant'} onClick={() => setSelection('assistant')}>僅選模型</button>
    <span className="dsh-ue-export-count">已選擇 {selected.length} 條</span>
    {format === 'md' ? null : <label className="dsh-ue-export-font"><span>PDF 字級</span><input type="range" min={MIN_PRINT_FONT_SIZE} max={MAX_PRINT_FONT_SIZE} step="1" value={fontSize} onChange={(event) => setFontSize(sanitizePrintFontSize(Number(event.target.value)))} /><output aria-live="polite">{fontSize} px</output></label>}
    <button className="dsh-ue-export-submit" type="button" disabled={selected.length === 0} onClick={exportSelected}>匯出</button>
    <button className="dsh-ue-export-close" type="button" aria-label="關閉匯出選擇" onClick={onClose}>×</button>
  </section>
}

function CostChip({ label, usage, model, period }: { readonly label: string, readonly usage: TokenUsage, readonly model: PricedModel, readonly period: PricePeriod }) {
  const cost = estimateTwd(usage, model, period, DEFAULT_COST_SETTINGS.twdPerCny)
  return <span className="dsh-ue-cost-chip" title={`未快取輸入 ${usage.uncachedInputTokens.toLocaleString('zh-TW')} · 快取讀取 ${usage.cacheReadTokens.toLocaleString('zh-TW')} · 輸出 ${usage.outputTokens.toLocaleString('zh-TW')}`}>{label} 約 {formatTwd(cost)} <small>· {modelLabel(model)}</small></span>
}

function PricePeriodBadge({ period }: { readonly period: PricePeriod }) {
  const peak = period === 'peak'
  return <span className={peak ? 'dsh-ue-period dsh-ue-period--peak' : 'dsh-ue-period dsh-ue-period--offpeak'} title={`DeepSeek 尖峰時段：${PEAK_HOURS_LABEL}`}><strong>{peak ? '尖峰中' : '離峰中'}</strong><small>尖峰：{PEAK_HOURS_LABEL}</small></span>
}

export function SessionUsageExportDock({ useSession, useProjection }: SessionUsageExportDockProps) {
  const nodes = useSession((state) => state.chat.legacy.nodes)
  const sessionUsage = usageFrom(useProjection('tokenUsage'))
  const projectedTurn = projectedTurnUsageFrom(useProjection('usageExportTurnUsage'))
  const nodeTurn = useMemo(() => latestTurnUsage(nodes), [nodes])
  const currentTurn = projectedTurn ?? nodeTurn
  const messages = useMemo(() => exportableMessages(nodes), [nodes])
  const [feedback, setFeedback] = useState('')
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null)
  const period = pricePeriodAt(new Date())
  const currentUsage = currentTurn?.usage ?? null
  const model = modelFromName(currentTurn?.model ?? null, DEFAULT_COST_SETTINGS.fallbackModel)
  const deepSeek = isDeepSeekProvider(currentTurn?.provider ?? null)
  const canShowCost = deepSeek && (currentUsage !== null || sessionUsage !== null)
  return <section className="dsh-ue-root dsh-ue-session" aria-label="本次用量成本與回答匯出">
    <div className="dsh-ue-summary">
      {canShowCost ? <PricePeriodBadge period={period} /> : null}
      {currentUsage === null || !deepSeek ? null : <CostChip label="本次指令" usage={currentUsage} model={model} period={period} />}
      {sessionUsage === null || !deepSeek ? null : <CostChip label="全對話累計" usage={sessionUsage} model={model} period={period} />}
      {canShowCost ? null : <span className="dsh-ue-empty">完成一輪 DeepSeek 回覆後，這裡會顯示成本。</span>}
      <div className="dsh-ue-actions"><button type="button" disabled={messages.length === 0} onClick={() => setExportFormat('md')}>匯出 MD</button><button type="button" disabled={messages.length === 0} onClick={() => setExportFormat('pdf')}>匯出 PDF</button></div>
    </div>
    {exportFormat === null ? null : <ExportPicker format={exportFormat} messages={messages} onClose={() => setExportFormat(null)} onFeedback={setFeedback} />}
    <span className="dsh-ue-sr-only" role="status">{feedback}</span>
  </section>
}
