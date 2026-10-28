/**
 * Runtime seam stamper for the Catppuccin glass layer.
 *
 * The glass stylesheet keys off stable data-* hooks (`data-dsh-glass-frame`,
 * `data-dsh-glass-trajectory`, `data-dsh-glass-stats`, …) that are NOT part
 * of the stock DSH markup, so this module stamps them onto the matching
 * elements at runtime — the stylesheet works with zero base edits. Each
 * selector uses only stable attributes already present in the stock UI
 * (`data-composer-card`, `data-conversation-composer-overlay`, `data-slot`,
 * ARIA roles) or lightningcss-preserved class-name substrings.
 *
 * Stamps are idempotent and inert without the `data-dsh-glass` root attribute
 * (the whole stylesheet is gated on it), so they are simply left in place when
 * the layer flips off — "off" still renders the exact stock UI.
 */

interface Seam {
  /** Attribute to stamp (bare name; value is always ''). */
  readonly attribute: string
  /** CSS selector for the element(s) to stamp. */
  readonly selector: string
  /** Stamp only the first (topmost) match, not every descendant match. */
  readonly first?: boolean
}

const SEAMS: readonly Seam[] = [
  // The layout frame: the sidebar column's direct parent.
  { attribute: 'data-dsh-glass-frame', selector: ':has(> [class*="sidebarCol"])' },
  // The sidebar content root (topmost `root` under the column — settings
  // internals also carry a `root` class but sit deeper, so first match wins).
  { attribute: 'data-dsh-glass-sidebar-root', selector: '[class*="sidebarCol"] [class*="root"]', first: true },
  // New-session button (a raised-surface seam).
  { attribute: 'data-dsh-glass-surface', selector: 'button[class*="newSession"]' },
  // Trajectory view (the composer-overlay view).
  { attribute: 'data-dsh-glass-trajectory', selector: '[data-conversation-composer-overlay]' },
  // Right panel (会话右侧栏 / 详情栏). The column was renamed upstream —
  // `detailsCol` through 0.1.2-rc.1, `rightbarCol` from 0.1.5-rc.2 on
  // (ui-layout/src/client/AppFrame.module.css) — and the old `[class*="root"]`
  // descendant had no stable target: ui-sidebar-right ships `.session` /
  // `.panel`, while the tab views it hosts DO carry a `root` class
  // (ui-sidebar-files / browser / terminal), so the stamp landed on whichever
  // content view happened to be open — and on none of them for the document
  // preview. The panel itself carries the stable `data-sidebar-right-panel`
  // attribute (SidebarRight.tsx), which is what the stylesheet actually wants
  // (it makes the panel background transparent so the ground shows through).
  { attribute: 'data-dsh-glass-details', selector: '[class*="rightbarCol"] [data-sidebar-right-panel], [class*="detailsCol"] [class*="root"]', first: true },
  // Composer bar root: the composer card's direct parent.
  { attribute: 'data-dsh-glass-inputbar', selector: ':has(> [data-composer-card])' },
  // Composer attach "+" button (ui-conversation InputBar.tsx -> css.add).
  { attribute: 'data-dsh-glass-add', selector: '[data-composer-card] [class*="add"]' },
  // Session stats line under the composer (composer.dock slot). The slot renders
  // the entry with no wrapper of its own, so StatsPills' own root is both the
  // slot's direct child and a `root`-classed div (`<div className={css.root}
  // data-composer-stats>` in ui-chat/src/client/chat/StatsPills.tsx, present in
  // 0.1.5-rc.2 and 0.1.7 alike). Picking the row by position (`> *`) keeps
  // working if that class name ever changes; both parts resolve to the same
  // element today, and stamping is idempotent.
  { attribute: 'data-dsh-glass-stats', selector: '[data-slot="conversation.composer.dock"] > *, [data-slot="conversation.composer.dock"] [class*="root"]' },
  // Settings dialog: a fixed overlay portalled inside the sidebar column
  // (the wrapper around the dialog panel in dsh-client-ui-settings-general).
  // Its rows/pickers paint themselves with the opaque raised-surface tokens,
  // so the stylesheet needs one hook on the dialog to re-point them at glass
  // mixes. Matched by the panel's accessible attributes, not its CSS-module
  // class: the host class name is a build hash (`VOzbGW_overlay`) that changes
  // whenever the host stylesheet does, and a stale selector would silently
  // drop the settings dialog back to opaque cards.
  { attribute: 'data-dsh-glass-settings', selector: ':has(> [role="dialog"][aria-modal="true"])' },
]

function stamp(seam: Seam): void {
  if (seam.first) {
    const el = document.querySelector(seam.selector)
    if (el !== null && !el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, '')
    return
  }
  for (const el of document.querySelectorAll(seam.selector)) {
    if (!el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, '')
  }
}

function stampAll(): void {
  for (const seam of SEAMS) stamp(seam)
}

/**
 * Stamp the seams once, then keep them stamped as React remounts nodes.
 *
 * The observer callback is debounced through `requestAnimationFrame` (item
 * N): DSH chat streaming mutates the DOM per token, and re-stamping on
 * every single mutation would re-run every selector per token. One frame
 * merges all mutations into one `stampAll()` — a streamed burst of N
 * mutations costs 1 stamp pass, and a frame with no mutations costs
 * nothing (the dirty flag skips the no-op stamp). Stamping stays idempotent
 * and cheap: `stamp()` only sets attributes that are missing.
 *
 * @returns a disposer that disconnects the observer and cancels any
 *  pending frame.
 */
export function startGlassSeamStamper(): () => void {
  stampAll()
  let frame: number | undefined
  let dirty = false
  let disposed = false
  const stampFrame = (): void => {
    frame = undefined
    if (!dirty) return
    dirty = false
    stampAll()
  }
  const schedule = (): void => {
    // A MutationObserver callback can already be queued as a microtask when the
    // disposer runs — disconnect() does not recall it. Without this guard that
    // callback re-arms a frame and stamps *after* dispose (full-suite timing
    // exposes it; single-file runs usually win the race).
    if (disposed) return
    dirty = true
    if (frame !== undefined) return
    frame = requestAnimationFrame(stampFrame)
  }
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  return () => {
    disposed = true
    observer.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    dirty = false
  }
}
