import { Renderer, marked } from 'marked'

export interface ExportBlock {
  readonly kind?: unknown
  readonly type?: unknown
  readonly text?: unknown
}

export interface ExportNode {
  readonly kind?: unknown
  readonly blocks?: unknown
  readonly content?: unknown
  readonly requestConfig?: unknown
  readonly provenance?: unknown
  readonly time?: unknown
  readonly turn?: unknown
  readonly seq?: unknown
}

export interface ExportableResponse {
  readonly text: string
  readonly model: string | null
  readonly time: number | null
}

export type ExportRole = 'user' | 'assistant'
export type ExportSelection = ExportRole | 'all' | null
export const MIN_PRINT_FONT_SIZE = 5
export const MAX_PRINT_FONT_SIZE = 20
export const DEFAULT_PRINT_FONT_SIZE = 11
export type PrintFontSize = number

export function sanitizePrintFontSize(value: unknown): PrintFontSize {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PRINT_FONT_SIZE
  return Math.min(MAX_PRINT_FONT_SIZE, Math.max(MIN_PRINT_FONT_SIZE, Math.round(value)))
}

export interface ExportableMessage extends ExportableResponse {
  readonly id: string
  readonly role: ExportRole
  readonly turn: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function textFromBlocks(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return (value as readonly ExportBlock[])
    .filter((block) => typeof block.text === 'string' && (block.kind === 'text' || block.type === 'text'))
    .map((block) => block.text as string)
    .join('\n\n')
    .trim()
}

function modelOf(node: ExportNode): string | null {
  const request = isRecord(node.requestConfig) ? node.requestConfig : null
  const provenance = isRecord(node.provenance) ? node.provenance : null
  const value = request?.model ?? provenance?.model
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function timeOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function turnOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

/** Only visible text blocks are exported; reasoning, tools, and attachments stay private. */
export function latestAssistantResponse(nodes: readonly ExportNode[]): ExportableResponse | null {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node.kind !== 'assistant') continue
    const text = textFromBlocks(node.blocks)
    if (text !== '') return { text, model: modelOf(node), time: timeOf(node.time) }
  }
  return null
}

/** Make the visible user/model transcript available to the export chooser. */
export function exportableMessages(nodes: readonly ExportNode[]): readonly ExportableMessage[] {
  let inferredTurn = 0
  const messages: ExportableMessage[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.kind !== 'user' && node.kind !== 'assistant') continue
    const role = node.kind
    const text = textFromBlocks(role === 'user' ? node.content : node.blocks)
    if (text === '') continue
    if (role === 'user') inferredTurn += 1
    const explicitTurn = turnOf(node.turn)
    const turn = explicitTurn ?? (inferredTurn === 0 ? null : inferredTurn)
    const sequence = typeof node.seq === 'number' && Number.isSafeInteger(node.seq) ? node.seq : index
    messages.push({ id: `${role}-${sequence}`, role, text, model: role === 'assistant' ? modelOf(node) : null, time: timeOf(node.time), turn })
  }
  return messages
}

export function selectExportMessages(messages: readonly ExportableMessage[], selection: ExportSelection): readonly ExportableMessage[] {
  if (selection === null) return []
  return selection === 'all' ? messages : messages.filter((message) => message.role === selection)
}

function exportTimestamp(time: number | null): string {
  const date = new Date(time ?? Date.now())
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Taipei' }).format(date)
}

function filenameTimestamp(time: number | null): string {
  return new Date(time ?? Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function responseFilename(response: ExportableResponse, extension: 'md' | 'pdf'): string {
  return `dsh-回答-${filenameTimestamp(response.time)}.${extension}`
}

function transcriptTime(messages: readonly ExportableMessage[]): number | null {
  return messages.at(-1)?.time ?? null
}

function transcriptFilename(messages: readonly ExportableMessage[], extension: 'md' | 'pdf'): string {
  return `dsh-對話-${filenameTimestamp(transcriptTime(messages))}.${extension}`
}

export function buildMarkdownExport(response: ExportableResponse): string {
  const metadata = [`匯出時間：${exportTimestamp(response.time)}`, response.model === null ? null : `模型：${response.model}`]
    .filter((value): value is string => value !== null)
  return ['# DSH 回答', '', ...metadata, '', '---', '', response.text, ''].join('\n')
}

export function buildTranscriptMarkdownExport(messages: readonly ExportableMessage[]): string {
  return messages.flatMap((message) => [
    `## Turn ${message.turn ?? '?'} · ${message.role === 'user' ? '使用者' : '助理'}`,
    '',
    message.text,
    '',
  ]).join('\n')
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

/** Markdown is rendered, while raw HTML and external media are intentionally excluded from the print window. */
export function renderMarkdownForPrint(markdown: string): string {
  const renderer = new Renderer()
  renderer.html = () => ''
  renderer.link = ({ tokens }) => renderer.parser.parseInline(tokens)
  renderer.image = ({ text }) => escapeHtml(text)
  return marked.parse(markdown, { async: false, gfm: true, breaks: false, renderer })
}

function printableMessage(message: ExportableMessage): string {
  const role = message.role === 'user'
    ? { className: 'user', icon: '👤', label: '使用者' }
    : { className: 'assistant', icon: '🤖', label: '助理' }
  const metadata = message.role === 'assistant' && message.model !== null ? `<span class="dsh-pw-print-model">${escapeHtml(message.model)}</span>` : ''
  return `<article class="dsh-pw-print-message dsh-pw-print-message--${role.className}"><h2><span aria-hidden="true">${role.icon}</span> ${role.label}${metadata}</h2><div class="dsh-pw-print-body">${renderMarkdownForPrint(message.text)}</div></article>`
}

function printStyles(fontSize: PrintFontSize): string {
  return `@page{margin:16mm 18mm}*{box-sizing:border-box}body{margin:0;color:#101828;background:#fff;font:${fontSize}px/1.72 "Songti TC","STSong","Times New Roman",serif;text-rendering:optimizeLegibility}main{max-width:178mm;margin:0 auto}.dsh-pw-print-turn{margin:0 0 1.625em}.dsh-pw-print-turn>h1{margin:0 0 1em;color:#344054;font-size:1.25em;font-weight:700;line-height:1.25}.dsh-pw-print-message{margin:0 0 1.25em}.dsh-pw-print-message>h2{display:flex;align-items:center;gap:.39em;margin:0 0 .56em;color:#152238;font-size:1.125em;font-weight:700;line-height:1.35}.dsh-pw-print-model{margin-left:.25em;color:#667085;font-size:.75em;font-weight:400}.dsh-pw-print-body{padding:.125em 0 .125em 1.25em;border-left:4px solid #e3e7ed;overflow-wrap:anywhere}.dsh-pw-print-message--assistant .dsh-pw-print-body{border-left-color:#86bfff}.dsh-pw-print-body>*:first-child{margin-top:0}.dsh-pw-print-body>*:last-child{margin-bottom:0}.dsh-pw-print-body h1,.dsh-pw-print-body h2,.dsh-pw-print-body h3,.dsh-pw-print-body h4,.dsh-pw-print-body h5,.dsh-pw-print-body h6{color:#101828;line-height:1.38;break-after:avoid}.dsh-pw-print-body h1{margin:1.17em 0 .5em;font-size:1.5em}.dsh-pw-print-body h2{margin:1.14em 0 .48em;font-size:1.3125em}.dsh-pw-print-body h3{margin:1.1em 0 .47em;font-size:1.1875em}.dsh-pw-print-body h4{margin:1.06em 0 .47em;font-size:1.0625em}.dsh-pw-print-body p{margin:0 0 .81em}.dsh-pw-print-body strong{font-weight:700}.dsh-pw-print-body ul,.dsh-pw-print-body ol{margin:.44em 0 .88em;padding-left:1.75em}.dsh-pw-print-body li{margin:.31em 0;padding-left:.13em}.dsh-pw-print-body blockquote{margin:.94em 0;padding:.31em 1em;border-left:4px solid #98c5fb;color:#475467}.dsh-pw-print-body pre{margin:1em 0;padding:.81em .94em;border:1px solid #d7dde5;border-radius:6px;background:#f6f8fa;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid;font:.75em/1.58 ui-monospace,SFMono-Regular,Menlo,monospace}.dsh-pw-print-body :not(pre)>code{padding:.06em .25em;border-radius:4px;background:#eef2f6;color:#23334d;font:.88em ui-monospace,SFMono-Regular,Menlo,monospace}.dsh-pw-print-body table{width:100%;margin:1em 0;border-collapse:collapse;font-size:.875em}.dsh-pw-print-body th,.dsh-pw-print-body td{padding:.44em .56em;border:1px solid #d7dde5;text-align:left;vertical-align:top}.dsh-pw-print-body th{background:#f4f7fa;font-weight:700}.dsh-pw-print-body hr{height:1px;margin:1.38em 0;border:0;background:#d7dde5}.dsh-pw-print-body a{color:#175cd3;text-decoration:underline}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.dsh-pw-print-turn>h1,.dsh-pw-print-message>h2{break-after:avoid}}`
}

/** Produce a Turn-by-Turn print document matching the in-product transcript style. */
export function buildPrintableTranscriptDocument(messages: readonly ExportableMessage[], fontSize: PrintFontSize = DEFAULT_PRINT_FONT_SIZE): string {
  const groups: Array<{ readonly turn: number | null, readonly messages: ExportableMessage[] }> = []
  for (const message of messages) {
    const prior = groups.at(-1)
    if (prior !== undefined && prior.turn === message.turn) prior.messages.push(message)
    else groups.push({ turn: message.turn, messages: [message] })
  }
  const turns = groups.map((group, index) => `<section class="dsh-pw-print-turn"><h1>Turn ${group.turn ?? index + 1}</h1>${group.messages.map(printableMessage).join('')}</section>`).join('')
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${escapeHtml(transcriptFilename(messages, 'pdf'))}</title><style>${printStyles(sanitizePrintFontSize(fontSize))}</style></head><body><main>${turns}</main></body></html>`
}

/** Backward-compatible single-response print view, rendered with the new style. */
export function buildPrintableDocument(response: ExportableResponse, fontSize: PrintFontSize = DEFAULT_PRINT_FONT_SIZE): string {
  return buildPrintableTranscriptDocument([{ id: 'assistant-response', role: 'assistant', turn: 1, ...response }], fontSize)
}

export function downloadMarkdown(response: ExportableResponse): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false
  const url = URL.createObjectURL(new Blob([buildMarkdownExport(response)], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = responseFilename(response, 'md')
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}

export function downloadTranscriptMarkdown(messages: readonly ExportableMessage[]): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || messages.length === 0) return false
  const url = URL.createObjectURL(new Blob([buildTranscriptMarkdownExport(messages)], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = transcriptFilename(messages, 'md')
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}

/** Native print keeps CJK glyph fallback reliable while preserving browser PDF controls. */
export function openPdfPrint(messages: readonly ExportableMessage[], fontSize: PrintFontSize = DEFAULT_PRINT_FONT_SIZE): boolean {
  if (typeof window === 'undefined' || messages.length === 0) return false
  const popup = window.open('', '_blank', 'popup,width=900,height=760')
  if (popup === null) return false
  popup.document.open()
  popup.document.write(buildPrintableTranscriptDocument(messages, fontSize))
  popup.document.close()
  popup.focus()
  popup.setTimeout(() => popup.print(), 180)
  return true
}
