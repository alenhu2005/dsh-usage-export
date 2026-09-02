import { describe, expect, it } from 'vitest'
import { buildMarkdownExport, buildPrintableDocument, buildPrintableTranscriptDocument, exportableMessages, latestAssistantResponse, responseFilename, sanitizePrintFontSize, selectExportMessages } from '../src/client/export.ts'

describe('reply export', () => {
  const response = { text: '# 結果\n\n<script>alert(1)</script>', model: 'deepseek-v4-flash', time: Date.parse('2026-09-01T12:34:56.000Z') }

  it('exports only the latest visible assistant text block', () => {
    const latest = latestAssistantResponse([
      { kind: 'assistant', blocks: [{ kind: 'text', text: '舊回答' }] },
      { kind: 'assistant', requestConfig: { model: 'deepseek-v4-flash' }, time: response.time, blocks: [{ kind: 'reasoning', text: '不要匯出' }, { kind: 'text', text: response.text }, { kind: 'tool-call', text: '不要匯出' }] },
    ])
    expect(latest).toEqual(response)
    expect(buildMarkdownExport(latest!)).toContain('# DSH 回答')
    expect(responseFilename(latest!, 'md')).toMatch(/\.md$/)
  })

  it('renders Markdown into a safe document instead of leaving its syntax as body text', () => {
    const html = buildPrintableDocument(response)
    expect(html).toContain('<h1>結果</h1>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('Songti TC')
  })

  it('scales the complete printable document to the requested PDF font size', () => {
    expect(buildPrintableDocument(response)).toContain('font:11px/1.72')
    const html = buildPrintableDocument(response, 18)
    expect(html).toContain('font:18px/1.72')
    expect(html).toContain('font-size:1.5em')
    expect(sanitizePrintFontSize(3)).toBe(5)
    expect(sanitizePrintFontSize(24)).toBe(20)
  })

  it('builds selectable user and model messages for the transcript-style export', () => {
    const messages = exportableMessages([
      { kind: 'user', time: response.time - 1, content: [{ type: 'text', text: '請用 **粗體** 回答' }] },
      { kind: 'assistant', turn: 1, time: response.time, blocks: [{ kind: 'text', text: '# 結果\n\n- 第一點' }] },
      { kind: 'assistant', turn: 1, time: response.time + 1, blocks: [{ kind: 'reasoning', text: '不匯出' }] },
    ])
    expect(messages.map((message) => message.role)).toEqual(['user', 'assistant'])
    expect(selectExportMessages(messages, 'user')).toHaveLength(1)
    expect(selectExportMessages(messages, 'assistant')).toHaveLength(1)
    const html = buildPrintableTranscriptDocument(selectExportMessages(messages, 'all'))
    expect(html).toContain('Turn 1')
    expect(html).toContain('使用者')
    expect(html).toContain('助理')
    expect(html).toContain('<strong>粗體</strong>')
    expect(html).toContain('<ul>')
  })
})
