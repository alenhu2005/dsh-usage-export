export function adoptStyles(): void {
  if (typeof document === 'undefined' || document.querySelector('style[data-dsh-usage-export]') !== null) return
  const style = document.createElement('style')
  style.dataset.dshUsageExport = 'true'
  style.textContent = `
    [data-dsh-ue-stats-line="true"] { display: flex !important; width: fit-content !important; max-width: 100%; flex-wrap: wrap; align-items: center; justify-content: center; column-gap: 8px; row-gap: 2px; margin-inline: auto; overflow: visible !important; text-overflow: clip !important; white-space: normal !important; font-variant-numeric: tabular-nums; }
    [data-dsh-ue-stats-line="true"] > span { flex: 0 0 auto; white-space: nowrap; }
    [data-dsh-ue-stats-line="true"] > span[aria-hidden="true"] { display: none; }
    .dsh-ue-root { color: var(--dsw-alias-label-primary, #f4f4f5); font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .dsh-ue-session { display: grid; width: min(100%, 980px); min-width: 0; box-sizing: border-box; grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 5px 12px 9px; margin: 0 auto; color: var(--dsw-alias-label-secondary, #a1a1aa); font-size: 12px; }
    .dsh-ue-summary { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .dsh-ue-cost-chip, .dsh-ue-period { display: inline-flex; min-height: 30px; align-items: center; gap: 4px; padding: 0 10px; border: 1px solid color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 42%, transparent); border-radius: 999px; color: var(--dsw-alias-label-primary, #f4f4f5); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .dsh-ue-cost-chip { background: color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 10%, transparent); font-weight: 650; }
    .dsh-ue-cost-chip small, .dsh-ue-period small { color: var(--dsw-alias-label-secondary, #a1a1aa); font-size: 11px; font-weight: 500; }
    .dsh-ue-period { border-color: var(--dsw-alias-border-l1, rgba(255,255,255,.08)); gap: 5px; }
    .dsh-ue-period strong { font-size: 12px; }
    .dsh-ue-period--peak { border-color: color-mix(in srgb, #f59e0b 54%, transparent); background: color-mix(in srgb, #f59e0b 13%, transparent); }
    .dsh-ue-period--peak strong { color: #f59e0b; }
    .dsh-ue-period--offpeak { background: color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 8%, transparent); }
    .dsh-ue-actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; justify-content: center; gap: 5px; }
    .dsh-ue-actions button { min-height: 32px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.08)); border-radius: 8px; color: var(--dsw-alias-label-secondary, #a1a1aa); background: transparent; cursor: pointer; font: inherit; font-size: 12px; transition-property: color, background-color, border-color; transition-duration: 150ms; transition-timing-function: ease-out; }
    .dsh-ue-actions button:hover:not(:disabled) { color: var(--dsw-alias-label-primary, #f4f4f5); border-color: color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 50%, transparent); background: color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 12%, transparent); }
    .dsh-ue-actions button:disabled { cursor: not-allowed; opacity: .52; }
    .dsh-ue-export-picker { position: fixed; z-index: 90; top: max(10px, env(safe-area-inset-top)); left: 50%; display: flex; width: min(calc(100vw - 24px), 980px); min-width: 0; box-sizing: border-box; flex: none; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 8px 10px; margin: 0; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12)); border-radius: 14px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #18181b) 94%, var(--dsw-alias-bg-layer-3, #27272a) 6%); box-shadow: 0 8px 20px rgba(0,0,0,.14); color: var(--dsw-alias-label-primary, #f4f4f5); transform: translateX(-50%); }
    .dsh-ue-export-picker--anchored { transform: none; }
    .dsh-ue-export-choice, .dsh-ue-export-submit, .dsh-ue-export-close { min-height: 36px; border: 0; color: inherit; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
    .dsh-ue-export-choice { min-width: 84px; padding: 0 11px; border-radius: 9px; background: var(--dsw-alias-bg-layer-3, #27272a); }
    .dsh-ue-export-choice:hover, .dsh-ue-export-choice[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #27272a) 76%, var(--dsw-alias-button-primary-fill, #3b82f6) 24%); color: var(--dsw-alias-label-primary, #fff); }
    .dsh-ue-export-choice[aria-pressed="true"] { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-button-primary-fill, #3b82f6) 78%, transparent); }
    .dsh-ue-export-count { min-width: 96px; color: var(--dsw-alias-label-secondary, #a1a1aa); font-size: 13px; font-weight: 650; text-align: center; white-space: nowrap; }
    .dsh-ue-export-font { display: inline-flex; min-height: 36px; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.08)); border-radius: 9px; color: var(--dsw-alias-label-secondary, #a1a1aa); font-size: 12px; font-weight: 650; white-space: nowrap; }
    .dsh-ue-export-font input { width: 108px; accent-color: var(--dsw-alias-button-primary-fill, #3b82f6); cursor: pointer; }
    .dsh-ue-export-font output { min-width: 35px; color: var(--dsw-alias-label-primary, #f4f4f5); font-variant-numeric: tabular-nums; text-align: right; }
    .dsh-ue-export-submit { min-width: 80px; padding: 0 14px; border-radius: 9px; background: var(--dsw-alias-button-primary-fill, #2563eb); color: var(--dsw-alias-button-primary-foreground, #fff); }
    .dsh-ue-export-submit:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-button-primary-fill, #2563eb) 84%, white 16%); color: var(--dsw-alias-button-primary-foreground, #fff); }
    .dsh-ue-export-submit:disabled { cursor: not-allowed; opacity: .45; }
    .dsh-ue-export-close { width: 36px; padding: 0; border-radius: 9px; background: transparent; color: var(--dsw-alias-label-secondary, #a1a1aa); font-size: 24px; font-weight: 400; line-height: 1; }
    .dsh-ue-export-close:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #27272a) 72%, var(--dsw-alias-button-primary-fill, #3b82f6) 28%); color: var(--dsw-alias-label-primary, #fff); }
    .dsh-ue-empty { min-height: 30px; display: inline-flex; align-items: center; color: var(--dsw-alias-label-tertiary, #71717a); }
    .dsh-ue-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .dsh-ue-actions button:focus-visible, .dsh-ue-export-choice:focus-visible, .dsh-ue-export-font input:focus-visible, .dsh-ue-export-submit:focus-visible, .dsh-ue-export-close:focus-visible { outline: 2px solid var(--dsw-alias-button-primary-fill, #3b82f6); outline-offset: 2px; }
    @media (max-width: 600px) { .dsh-ue-session { gap: 5px; padding-bottom: 10px; } .dsh-ue-summary { flex-direction: column; gap: 5px; } .dsh-ue-cost-chip, .dsh-ue-period { max-width: 100%; white-space: normal; text-align: center; justify-content: center; } .dsh-ue-export-picker { gap: 6px; padding: 7px; border-radius: 12px; } .dsh-ue-export-choice { min-width: 0; flex: 1 1 30%; } .dsh-ue-export-count { flex: 1 1 46%; min-width: 0; } .dsh-ue-export-font { flex: 1 1 44%; justify-content: center; } .dsh-ue-export-submit { flex: 1 1 30%; min-width: 0; } }
  `
  document.head.append(style)
}
