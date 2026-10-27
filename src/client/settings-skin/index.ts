import type { Context } from '@deepseek-ai/cordis'
import { classifySettingsButton, SETTINGS_NAV_GROUPS } from './model.ts'
import { getNavSearchQuery, setNavSearchQuery, subscribeNavSearch, setSkinEnabledState } from './SettingsNavHeader.tsx'
import { en, zh, NS } from '../locales.ts'

export const SETTINGS_SKIN_STYLE_ID = 'dcu-official-settings-skin'

export const SETTINGS_SKIN_CSS = `
/* 全屏工作台 Presentation 遮罩层铺满 */
body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1000 !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: stretch !important;
  padding: 0 !important;
  background-color: transparent !important;
}

/* 模态框外壳：全屏 100vw x 100vh 工作台形态 */
[data-shortcut-modal="settings"] {
  box-sizing: border-box !important;
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  box-shadow: none !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: row !important;
}

/* 桌面平台窗口标题栏避让：在具有 Windows/macOS 顶栏的环境下平滑下移，绝不遮盖或截断内容与操作区 */
html[data-platform="darwin"] body > [role="presentation"]:not(#root),
html[data-platform="darwin"] [data-shortcut-modal="settings"] {
  -webkit-app-region: initial;
}

html[data-windows-titlebar]:not([data-fullscreen]) body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"],
html[data-windows-titlebar]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px)) !important;
  height: calc(100vh - var(--dsh-windows-titlebar-height, var(--dsh-frame-chrome-top, 40px))) !important;
}

html[data-platform="darwin"]:not([data-fullscreen]) body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"],
html[data-platform="darwin"]:not([data-fullscreen]) [data-shortcut-modal="settings"] {
  top: var(--dsh-frame-top-clearance, 38px) !important;
  height: calc(100vh - var(--dsh-frame-top-clearance, 38px)) !important;
}

/* 左侧整列侧栏：240px 宽度 */
[data-shortcut-modal="settings"] > nav {
  box-sizing: border-box !important;
  width: 240px !important;
  min-width: 240px !important;
  max-width: 240px !important;
  flex-shrink: 0 !important;
  gap: 12px !important;
  padding: 16px 10px 24px !important;
  border-right: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-1, #121214) !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}

/* 顶部标题与搜索区插槽容器 */
[data-shortcut-modal="settings"] > nav > :first-child {
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  flex: none !important;
}

/* 顶部标题与返回栏 */
.dcu-settings-nav-header-top {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  height: 28px !important;
  padding: 0 2px !important;
}

.dcu-settings-back-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  cursor: pointer !important;
  padding: 0 !important;
  transition: color 0.12s ease, background 0.12s ease !important;
}

.dcu-settings-back-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dcu-settings-nav-header-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  letter-spacing: -0.01em !important;
  user-select: none !important;
}

/* 搜索框容器与输入框：对齐原生 Codex 风格 */
.dcu-settings-search-wrapper {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}

.dcu-settings-search-icon {
  position: absolute !important;
  left: 9px !important;
  width: 14px !important;
  height: 14px !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  pointer-events: none !important;
}

.dcu-settings-search-input {
  width: 100% !important;
  height: 32px !important;
  padding: 0 26px 0 28px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  border: 1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-size: 13px !important;
  box-sizing: border-box !important;
  outline: none !important;
  transition: border-color 0.12s ease, background-color 0.12s ease !important;
}

.dcu-settings-search-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  font-size: 13px !important;
}

.dcu-settings-search-input:focus {
  border-color: var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08)) !important;
}

.dcu-settings-search-clear {
  position: absolute !important;
  right: 6px !important;
  width: 18px !important;
  height: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  background: transparent !important;
  border: none !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  cursor: pointer !important;
}

.dcu-settings-search-clear:hover {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 导航项列表容器 */
[data-shortcut-modal="settings"] > nav > :nth-child(2) {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 4px 0 32px !important;
}

/* 分组小标题：字号12px、中灰、标准大小写、呼吸留白 */
.dcu-settings-nav-group-header {
  box-sizing: border-box !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--dsw-alias-label-tertiary, #8e8e8e) !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  padding: 16px 10px 6px !important;
  user-select: none !important;
}

.dcu-settings-nav-group-header:first-of-type {
  padding-top: 6px !important;
}

/* 空搜索提示 */
.dcu-settings-nav-empty {
  padding: 24px 10px;
  font-size: 13px;
  color: var(--dsw-alias-label-tertiary, #71717a);
  text-align: center;
  user-select: none;
}

/* 导航项按钮：Codex 原生胶囊形态（Capsule） */
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  height: 32px !important;
  min-height: 32px !important;
  padding-inline: 10px !important;
  border-radius: var(--dsw-radius-sm, 6px) !important;
  font-size: 13px !important;
  font-weight: 400 !important;
  color: var(--dsw-alias-label-secondary, #d4d4d8) !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  transition: background 0.12s ease, color 0.12s ease !important;
  text-align: left !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button svg {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0 !important;
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  stroke-width: 1.5 !important;
  transition: color 0.12s ease !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover, var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.05))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:hover svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

/* 选中菜单项：纯正 Codex 胶囊激活态（Capsule Pill） */
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"],
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] {
  background: var(--dsw-specific-sidebar-nav-item-active, var(--dsw-alias-interactive-bg-selected, rgba(255, 255, 255, 0.10))) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
  font-weight: 500 !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[aria-current="true"] svg,
[data-shortcut-modal="settings"] > nav > :nth-child(2) > button[class*="active"] svg {
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

[data-shortcut-modal="settings"] > nav > :nth-child(2) > button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, var(--dsw-static-deepseek-500, #4176e6)) !important;
  outline-offset: 1px !important;
}

/* 右侧内容工作区 */
[data-shortcut-modal="settings"] > div:not(nav) {
  display: flex !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  flex-direction: column !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  height: 100% !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child {
  box-sizing: border-box !important;
  height: 56px !important;
  min-height: 56px !important;
  padding: 0 32px !important;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.07)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child h2,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child span {
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
  letter-spacing: -0.01em;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a {
  color: var(--dsw-alias-label-secondary, #a1a1aa) !important;
  transition: color 0.15s ease;
}

[data-shortcut-modal="settings"] > div:not(nav) > :first-child button:hover,
[data-shortcut-modal="settings"] > div:not(nav) > :first-child a:hover {
  color: var(--dsw-alias-label-primary, #f4f4f5) !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) {
  box-sizing: border-box !important;
  min-height: 0 !important;
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  padding: 32px 48px 64px !important;
  background: var(--dsw-alias-bg-layer-2, #18181b) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

/* 右侧设置区固定宽度规范：居中排版，避免宽屏下拉伸 */
[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) > * > * {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
  box-sizing: border-box !important;
}

[data-shortcut-modal="settings"] > div:not(nav) > :nth-child(2) [class*="section"] {
  width: 100% !important;
  max-width: 800px !important;
  margin-inline: auto !important;
}

@media (max-width: 640px) {
  body:has(> [role="presentation"] > [data-shortcut-modal="settings"]) > [role="presentation"] {
    padding: 0;
  }

  [data-shortcut-modal="settings"] {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    border: none;
    flex-direction: column;
  }

  [data-shortcut-modal="settings"] > nav {
    width: 100%;
    min-width: 0;
    gap: 10px;
    padding: 12px 16px 8px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  [data-shortcut-modal="settings"] > nav > :first-child { padding-inline: 4px; }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) {
    flex-direction: row;
    overflow-x: auto;
  }

  [data-shortcut-modal="settings"] > nav > :nth-child(2) > button { flex: 0 0 auto; }

  [data-shortcut-modal="settings"] > div > :first-child { height: 48px; min-height: 48px; padding: 0 16px; }

  [data-shortcut-modal="settings"] > div > :nth-child(2) { padding: 16px; }
}
`

/** 探测宿主 settings-skin 子组件是否处于激活状态 */
export async function checkSettingsSkinEnabled(): Promise<boolean> {
  try {
    const response = await fetch('/api/dsh-codex-ui/settings-skin', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return false
    const data = await response.json()
    return data?.enabled === true
  } catch {
    // 无法连通 /api/dsh-codex-ui/settings-skin（例如子组件被停用导致端点不存在、或网络断开），坚决返回 false！
    return false
  }
}

/** 注入 Codex 1:1 设置皮肤样式 */
export function installSettingsSkin(doc: Document = document): () => void {
  const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID)
  if (existing !== null) return () => { existing.remove() }
  const style = doc.createElement('style')
  style.id = SETTINGS_SKIN_STYLE_ID
  style.textContent = SETTINGS_SKIN_CSS
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return () => { if (style.parentNode !== null) style.remove() }
}

/** 彻底卸载 Codex 设置皮肤并清理 DOM 样式节点 */
export function uninstallSettingsSkin(doc: Document = document): void {
  const existing = doc.getElementById(SETTINGS_SKIN_STYLE_ID)
  if (existing !== null) {
    existing.remove()
  }
}

/**
 * 对宿主动态生成的菜单按钮执行无侵入的已知项分组与搜索过滤
 */
export function decorateSettingsNav(panelEl: HTMLElement): () => void {
  const navHeader = panelEl.querySelector<HTMLElement>('nav > :first-child')
  const navList = panelEl.querySelector<HTMLElement>('nav > :nth-child(2)')
  if (!navList) return () => {}

  const isZh = (document.documentElement.lang || 'zh').startsWith('zh')
  const titleText = isZh ? zh['settings.title'] : en['settings.title']
  const backText = isZh ? zh['settings.back'] : en['settings.back']
  const searchText = isZh ? zh['settings.search'] : en['settings.search']

  // 1. 装饰顶部 Header（返回箭头 + 搜索框）
  let cleanHeader = () => {}
  if (navHeader && !navHeader.querySelector('.dcu-settings-nav-header-root')) {
    const originalChildren = Array.from(navHeader.childNodes)
    originalChildren.forEach(child => {
      if (child instanceof HTMLElement) child.style.display = 'none'
    })

    const headerRoot = document.createElement('div')
    headerRoot.className = 'dcu-settings-nav-header-root'

    const topRow = document.createElement('div')
    topRow.className = 'dcu-settings-nav-header-top'

    const backBtn = document.createElement('button')
    backBtn.type = 'button'
    backBtn.className = 'dcu-settings-back-btn'
    backBtn.setAttribute('aria-label', backText)
    backBtn.setAttribute('title', backText)
    backBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>'
    backBtn.onclick = () => {
      const closeBtn = panelEl.querySelector<HTMLButtonElement>('button[class*="close"]')
      if (closeBtn) closeBtn.click()
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
    }

    const titleSpan = document.createElement('span')
    titleSpan.className = 'dcu-settings-nav-header-title'
    titleSpan.textContent = titleText

    topRow.appendChild(backBtn)
    topRow.appendChild(titleSpan)

    const searchWrapper = document.createElement('div')
    searchWrapper.className = 'dcu-settings-search-wrapper'
    searchWrapper.innerHTML = '<svg class="dcu-settings-search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'

    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.className = 'dcu-settings-search-input'
    searchInput.placeholder = searchText
    searchInput.setAttribute('aria-label', searchText)
    searchInput.value = getNavSearchQuery()

    const clearBtn = document.createElement('button')
    clearBtn.type = 'button'
    clearBtn.className = 'dcu-settings-search-clear'
    clearBtn.setAttribute('aria-label', '清空搜索')
    clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none'
    clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'

    searchInput.oninput = () => {
      setNavSearchQuery(searchInput.value)
      clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none'
    }
    clearBtn.onclick = () => {
      searchInput.value = ''
      setNavSearchQuery('')
      clearBtn.style.display = 'none'
      searchInput.focus()
    }

    searchWrapper.appendChild(searchInput)
    searchWrapper.appendChild(clearBtn)

    headerRoot.appendChild(topRow)
    headerRoot.appendChild(searchWrapper)
    navHeader.appendChild(headerRoot)

    cleanHeader = () => {
      headerRoot.remove()
      originalChildren.forEach(child => {
        if (child instanceof HTMLElement) child.style.removeProperty('display')
      })
    }
  }

  // 2. 注入三组分组小标题（若不存在）
  for (const group of SETTINGS_NAV_GROUPS) {
    if (!navList.querySelector(`[data-dcu-group-header="${group.id}"]`)) {
      const header = document.createElement('div')
      header.className = 'dcu-settings-nav-group-header'
      header.setAttribute('data-dcu-group-header', group.id)
      header.style.setProperty('order', String(group.order))
      header.textContent = isZh ? group.defaultZh : group.defaultEn
      navList.appendChild(header)
    }
  }

  // 3. 注入空状态提示（若不存在）
  let emptyTip = navList.querySelector<HTMLElement>('[data-dcu-group-empty]')
  if (!emptyTip) {
    emptyTip = document.createElement('div')
    emptyTip.className = 'dcu-settings-nav-empty'
    emptyTip.setAttribute('data-dcu-group-empty', '')
    emptyTip.style.setProperty('order', '999')
    emptyTip.style.display = 'none'
    emptyTip.textContent = isZh ? zh['settings.noResults'] : en['settings.noResults']
    navList.appendChild(emptyTip)
  }

  // 4. 归类并赋 order 给宿主生成的每个 button
  const classifyButtons = () => {
    const buttons = navList.querySelectorAll<HTMLButtonElement>(':scope > button')
    buttons.forEach((btn, index) => {
      const label = btn.querySelector('span')?.textContent?.trim() ?? btn.textContent?.trim() ?? ''
      const group = classifySettingsButton(label)
      const baseOrder = group === 'personal' ? 100 : group === 'records' ? 300 : 200
      btn.style.setProperty('order', String(baseOrder + 1 + index))
      btn.setAttribute('data-dcu-group', group)
    })
  }
  classifyButtons()

  // 5. 搜索过滤联动
  const applyFilter = (query: string) => {
    const trimmed = query.trim().toLowerCase()
    const buttons = navList.querySelectorAll<HTMLButtonElement>(':scope > button')
    let totalVisible = 0

    for (const btn of buttons) {
      const label = (btn.querySelector('span')?.textContent ?? btn.textContent ?? '').toLowerCase()
      if (trimmed === '') {
        btn.style.removeProperty('display')
        totalVisible += 1
      } else {
        const matches = label.includes(trimmed)
        if (matches) {
          btn.style.removeProperty('display')
          totalVisible += 1
        } else {
          btn.style.setProperty('display', 'none', 'important')
        }
      }
    }

    for (const group of SETTINGS_NAV_GROUPS) {
      const header = navList.querySelector<HTMLElement>(`[data-dcu-group-header="${group.id}"]`)
      if (header) {
        if (trimmed === '') {
          header.style.removeProperty('display')
        } else {
          const visibleCount = [...navList.querySelectorAll<HTMLButtonElement>(`button[data-dcu-group="${group.id}"]`)]
            .filter(b => b.style.display !== 'none').length
          if (visibleCount > 0) {
            header.style.removeProperty('display')
          } else {
            header.style.setProperty('display', 'none', 'important')
          }
        }
      }
    }

    if (emptyTip) {
      emptyTip.style.setProperty('display', totalVisible === 0 ? 'block' : 'none', 'important')
    }
  }

  applyFilter(getNavSearchQuery())
  const unsubSearch = subscribeNavSearch(applyFilter)

  // 6. 监听宿主后续异步动态追加的 button
  const navObserver = new MutationObserver(() => {
    classifyButtons()
    applyFilter(getNavSearchQuery())
  })
  navObserver.observe(navList, { childList: true })

  return () => {
    cleanHeader()
    unsubSearch()
    navObserver.disconnect()
    navList.querySelectorAll('[data-dcu-group-header], [data-dcu-group-empty]').forEach(el => el.remove())
    navList.querySelectorAll<HTMLButtonElement>(':scope > button').forEach(btn => {
      btn.style.removeProperty('order')
      btn.style.display = ''
      btn.removeAttribute('data-dcu-group')
    })
  }
}

/**
 * 观察设置弹层的挂载并与子组件生命周期同步
 * 返回 Disposer，卸载时彻底移除 Observer、装饰器与注入样式
 */
export function observeSettingsSkin(_ctx?: Context): () => void {
  let disposed = false
  let cleanDecorator: (() => void) | undefined

  const sync = async (): Promise<void> => {
    if (disposed) return
    const enabled = await checkSettingsSkinEnabled()
    if (disposed) return
    setSkinEnabledState(enabled)
    if (enabled) {
      installSettingsSkin(document)
      const modal = document.querySelector<HTMLElement>('[data-shortcut-modal="settings"]')
      if (modal) {
        cleanDecorator?.()
        cleanDecorator = decorateSettingsNav(modal)
      }
    } else {
      cleanDecorator?.()
      cleanDecorator = undefined
      uninstallSettingsSkin(document)
    }
  }

  // 仅当 DOM 中已存在设置弹层时才触发同步，避免应用启动时在后台触发多余的网络探测与样式加载
  if (typeof document !== 'undefined' && document.querySelector('[data-shortcut-modal="settings"]')) {
    void sync()
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.getAttribute('data-shortcut-modal') === 'settings' || node.querySelector('[data-shortcut-modal="settings"]')) {
            void sync()
            return
          }
        }
      }
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    disposed = true
    observer.disconnect()
    cleanDecorator?.()
    setSkinEnabledState(false)
    uninstallSettingsSkin(document)
  }
}
