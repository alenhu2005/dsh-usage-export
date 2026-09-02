const STATS_MARKER = '快取命中'

function markStatsLine(root: ParentNode): void {
  for (const span of Array.from(root.querySelectorAll('span'))) {
    if (!span.textContent?.includes(STATS_MARKER)) continue
    const line = span.parentElement
    if (line !== null) line.dataset.dshUeStatsLine = 'true'
  }
}

/** Mark the host's generated statistics row without relying on its hashed CSS-module class. */
export function installStatsLineLayout(): () => void {
  if (typeof document === 'undefined') return () => undefined
  markStatsLine(document)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node instanceof Element) markStatsLine(node)
        if (node.parentElement !== null) markStatsLine(node.parentElement)
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}
