/** 默认输出独立验收脚本；--run 在无截图的 Chromium 中执行，供本地与 CI 共用。 */
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('src/client/CodexWorkspaceBrowser.tsx', 'utf8')
const names = new Set(['stylesheet', 'runningStyles', 'typographyStyles', 'collectionLayoutStyles'])
const file = ts.createSourceFile('tree.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const styles = []
for (const statement of file.statements) {
  if (!ts.isVariableStatement(statement)) continue
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && names.has(declaration.name.text) && declaration.initializer && ts.isNoSubstitutionTemplateLiteral(declaration.initializer)) styles.push(declaration.initializer.text)
  }
}
if (styles.length !== names.size) throw new Error('未提取到完整工作区样式')
const implementation = ts.transpileModule(readFileSync('src/client/workspace-drop-indicator.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace(/^export /gm, '')
const verify = async () => {
  const project = (id, sessions = '') => `<div class="dcu-wb-group-member" id="${id}"><div class="dcu-wb-project"><div class="dcu-wb-project-head">${id}</div><div class="dcu-wb-project-body" data-open="true">${sessions}</div></div></div>`
  const session = id => `<div class="dcu-wb-session dcu-wb-selected" id="${id}">${id}</div>`
  const group = (id, body = '') => `<div class="dcu-wb-collection" id="${id}"><div class="dcu-wb-collection-head">${id}</div><div class="dcu-wb-collection-body" data-open="true">${body}</div></div>`
  const cases = [
    { name: '分组之间', body: group('group-a') + group('group-b'), target: '#group-b', marker: 'dcu-wb-group-order-drop', upper: '#group-a>.dcu-wb-collection-head', lower: '#group-b>.dcu-wb-collection-head' },
    { name: '分组首项目', body: group('group-c', project('project-a')), target: '#project-a', upper: '#group-c>.dcu-wb-collection-head', lower: '#project-a .dcu-wb-project-head' },
    { name: '会话到下一项目', body: group('group-d', project('project-b', session('session-a')) + project('project-c')), target: '#project-c', upper: '#session-a', lower: '#project-c .dcu-wb-project-head' },
    { name: '会话之间', body: group('group-e', project('project-d', session('session-b') + session('session-c'))), target: '#session-c', upper: '#session-b', lower: '#session-c' },
    { name: '会话末尾', body: group('group-f', project('project-e', session('session-d')) + project('project-f')), target: '#session-d', after: true, upper: '#session-d', lower: '#project-f .dcu-wb-project-head' },
    { name: '首分组', body: group('group-g'), target: '#group-g', marker: 'dcu-wb-group-order-drop', upper: '.dcu-wb-section-head', lower: '#group-g>.dcu-wb-collection-head' },
  ]
  const results = []
  document.body.innerHTML = ''
  for (const theme of ['dark', 'light']) for (const width of [240, 275, 520]) {
    for (const test of cases) {
      const host = document.createElement('div')
      host.className = theme
      host.style.cssText = `width:${width}px;display:inline-block;vertical-align:top;margin:8px`
      host.innerHTML = `<h3>${test.name} ${width} ${theme}</h3><div class="dcu-wb"><div class="dcu-wb-tree" style="height:180px;flex:none"><section class="dcu-wb-section"><div class="dcu-wb-section-head">项目</div><div class="dcu-wb-section-body" data-open="true"><div class="dcu-wb-collections">${test.body}</div></div></section></div></div>`
      document.body.append(host)
      const root = host.querySelector('.dcu-wb-tree')
      const target = root.querySelector(test.target)
      target.classList.add(test.marker ?? 'dcu-wb-drop')
      if (test.after) target.classList.add('dcu-wb-drop-after')
      const dispose = mountWorkspaceDropIndicator(root)
      await new Promise(requestAnimationFrame)
      const upper = root.querySelector(test.upper).getBoundingClientRect().bottom
      const lower = root.querySelector(test.lower).getBoundingClientRect().top
      const line = root.querySelector('.dcu-wb-drop-indicator')
      const rect = line.getBoundingClientRect()
      const error = Math.abs(rect.top + rect.height / 2 - (upper + lower) / 2)
      if (error > 0.1) throw new Error(`${test.name} ${width} ${theme}: ${error}px`)
      const stroke = getComputedStyle(line, '::before')
      const ring = getComputedStyle(line, '::after')
      if (stroke.height !== '2px' || stroke.right !== '0px' || ring.width !== '8px' || ring.boxSizing !== 'border-box' || ring.borderTopWidth !== '2px') throw new Error('插入线线宽或圆环尺寸不符')
      root.style.height = '50px'
      root.scrollTop = 20
      await new Promise(requestAnimationFrame)
      const scrollRect = line.getBoundingClientRect()
      const scrollExpected = (root.querySelector(test.upper).getBoundingClientRect().bottom + root.querySelector(test.lower).getBoundingClientRect().top) / 2
      const scrollError = Math.abs(scrollRect.top + scrollRect.height / 2 - scrollExpected)
      if (scrollError > 0.1) throw new Error(`${test.name} 滚动后偏移 ${scrollError}px`)
      root.style.height = '180px'
      root.scrollTop = 0
      if (test.name === '会话到下一项目') {
        const body = root.querySelector('#project-b .dcu-wb-project-body')
        body.dataset.open = 'false'
        await new Promise(requestAnimationFrame)
        const expected = (root.querySelector('#project-b .dcu-wb-project-head').getBoundingClientRect().bottom + root.querySelector(test.lower).getBoundingClientRect().top) / 2
        const closed = line.getBoundingClientRect()
        if (Math.abs(closed.top + closed.height / 2 - expected) > 0.1) throw new Error('收起后仍使用隐藏会话边界')
        body.dataset.open = 'true'
      }
      await new Promise(requestAnimationFrame)
      results.push({ name: test.name, width, theme, error, scrollError, gap: lower - upper })
      // 保留测量布局，同时结束持续帧监听。
      const copy = line.cloneNode(true)
      dispose()
      root.dataset.dropIndicator = 'measured'
      root.append(copy)
    }
  }
  for (const theme of ['dark', 'light']) for (const width of [240, 275, 520]) {
    const host = document.createElement('div')
    host.className = theme
    host.style.cssText = `width:${width}px;display:inline-block;vertical-align:top;margin:8px`
    host.innerHTML = `<div class="dcu-wb"><div class="dcu-wb-collections">${group('empty-group', '<div class="dcu-wb-empty">暂无项目</div>')}${group('next-group', project('empty-project', '<div class="dcu-wb-nochat">暂无聊天</div>'))}</div></div>`
    document.body.append(host)
    const empty = host.querySelector('.dcu-wb-empty')
    const chat = host.querySelector('.dcu-wb-nochat')
    const style = getComputedStyle(empty)
    const chatStyle = getComputedStyle(chat)
    const rect = empty.getBoundingClientRect()
    const lineTop = rect.top + parseFloat(style.paddingTop)
    const lineBottom = lineTop + parseFloat(style.lineHeight)
    const above = lineTop - host.querySelector('#empty-group>.dcu-wb-collection-head').getBoundingClientRect().bottom
    const below = host.querySelector('#next-group>.dcu-wb-collection-head').getBoundingClientRect().top - lineBottom
    if (Math.abs(above - below) > 0.1) throw new Error(`空分组未居中: ${above}/${below}`)
    if (style.fontSize !== '13px' || style.lineHeight !== '18px' || style.fontSize !== chatStyle.fontSize || style.lineHeight !== chatStyle.lineHeight || style.color !== chatStyle.color) throw new Error('空状态字体不统一')
    const expectedColor = theme === 'dark' ? 'rgb(112, 120, 116)' : 'rgb(118, 126, 122)'
    if (style.color !== expectedColor || chatStyle.color !== expectedColor) throw new Error('空状态未使用三级灰 token')
    if (chatStyle.padding !== '1px 8px 5px 30px') throw new Error('空聊天四边间距不符')
    const body = empty.parentElement
    body.dataset.open = 'false'
    if (body.getBoundingClientRect().height !== 0) throw new Error('空分组收起残留间距')
    body.dataset.open = 'true'
    results.push({ name: '空状态居中与排版', width, theme, error: Math.abs(above - below), scrollError: 0, above, below })
  }
  for (const layout of ['pinned', 'grouped', 'flat']) {
    const host = document.createElement('div')
    host.className = 'dark'
    host.style.cssText = 'width:275px;display:inline-block;vertical-align:top;margin:8px'
    const items = '<div class="dcu-wb-project" id="chat-project"><div class="dcu-wb-project-head">dsh-im-connect</div><div class="dcu-wb-project-body" data-open="true"><div class="dcu-wb-nochat">暂无聊天</div></div></div><div class="dcu-wb-project" id="next-project"><div class="dcu-wb-project-head">dsh-automation</div></div>'
    host.innerHTML = `<h3>${layout}</h3><div class="dcu-wb"><div class="${layout === 'pinned' ? 'dcu-wb-pinned-list' : layout === 'flat' ? 'dcu-wb-collections' : 'dcu-wb-collection-body'}" data-open="true">${items}</div></div>`
    document.body.append(host)
    const chat = host.querySelector('.dcu-wb-nochat')
    const style = getComputedStyle(chat)
    const lineTop = chat.getBoundingClientRect().top + parseFloat(style.paddingTop)
    const above = lineTop - host.querySelector('#chat-project>.dcu-wb-project-head').getBoundingClientRect().bottom
    const below = host.querySelector('#next-project>.dcu-wb-project-head').getBoundingClientRect().top - lineTop - parseFloat(style.lineHeight)
    if (Math.abs(above - below) > 0.1) throw new Error(`暂无聊天 ${layout} 未居中: ${above}/${below}`)
    results.push({ name: `暂无聊天-${layout}`, above, below, error: Math.abs(above - below), scrollError: 0 })
  }
  {
    const host = document.createElement('div')
    host.className = 'dark'
    host.style.cssText = 'width:275px'
    host.innerHTML = '<div class="dcu-wb"><div class="dcu-wb-project"><div class="dcu-wb-project-head"><span class="dcu-wb-folder"><svg width="16" height="16" viewBox="0 0 16 16"></svg></span><span class="dcu-wb-project-title">项目名</span></div><div class="dcu-wb-project-body" data-open="true"><div class="dcu-wb-session" id="idle-session"><span class="dcu-wb-session-title">空闲会话</span></div><div class="dcu-wb-session" id="run-session"><span class="dcu-wb-session-title">运行会话</span><span class="dcu-wb-running"></span></div></div></div></div>'
    document.body.append(host)
    const folder = host.querySelector('.dcu-wb-folder').getBoundingClientRect()
    const projectTitle = host.querySelector('.dcu-wb-project-title').getBoundingClientRect()
    const idleTitle = host.querySelector('#idle-session .dcu-wb-session-title').getBoundingClientRect()
    const runTitle = host.querySelector('#run-session .dcu-wb-session-title').getBoundingClientRect()
    const spin = host.querySelector('.dcu-wb-running').getBoundingClientRect()
    if (Math.abs(spin.left - folder.left) > 0.5 || Math.abs(spin.width - folder.width) > 0.5) throw new Error(`转圈格子未与文件夹对齐: folder=${folder.left}/${folder.width} spin=${spin.left}/${spin.width}`)
    if (Math.abs(idleTitle.left - projectTitle.left) > 0.5) throw new Error(`空闲会话文字未与项目文字对齐: ${idleTitle.left} vs ${projectTitle.left}`)
    if (Math.abs(runTitle.left - projectTitle.left) > 0.5) throw new Error(`运行会话文字未与项目文字对齐: ${runTitle.left} vs ${projectTitle.left}`)
    results.push({ name: '会话与项目对齐', error: Math.max(Math.abs(spin.left - folder.left), Math.abs(idleTitle.left - projectTitle.left), Math.abs(runTitle.left - projectTitle.left)), scrollError: 0 })
  }
  {
    const host = document.createElement('div')
    host.className = 'dark'
    host.style.cssText = 'width:275px'
    host.innerHTML = '<div class="dcu-wb"><div class="dcu-wb-session" id="timed-session"><span class="dcu-wb-session-title">很长的会话标题用来检查省略号是否给右侧时间让位</span><span class="dcu-wb-session-time">23小时</span></div><div class="dcu-wb-session" id="pending-session"><span class="dcu-wb-session-title">待处理会话</span><span class="dcu-wb-pending" data-state="warning"><span class="dcu-wb-pending-dot"></span><span class="dcu-wb-pending-label">等待回答</span></span><span class="dcu-wb-session-time">23小时</span></div></div>'
    document.body.append(host)
    const title = host.querySelector('#timed-session .dcu-wb-session-title').getBoundingClientRect()
    const time = host.querySelector('#timed-session .dcu-wb-session-time')
    const timeBox = time.getBoundingClientRect()
    const pendingTime = host.querySelector('#pending-session .dcu-wb-session-time')
    if (timeBox.width < 8) throw new Error('会话行右侧时间未显示')
    if (timeBox.left + 0.5 < title.right) throw new Error(`会话行时间必须在标题右侧: title=${title.right} time=${timeBox.left}`)
    if (getComputedStyle(pendingTime).display !== 'none') throw new Error('待处理会话不得显示行内时间')
    results.push({ name: '会话行右侧时间', error: Math.max(0, title.right - timeBox.left), scrollError: 0 })
  }
  {
    const host = document.createElement('div')
    host.className = 'dark'
    host.style.cssText = 'width:275px'
    host.innerHTML = '<div class="dcu-wb"><div class="dcu-wb-session" id="scroll-session"><span class="dcu-wb-session-title" data-overflow style="--dcu-title-shift:80px;--dcu-title-duration:2000ms"><span class="dcu-wb-session-title-text">很长的会话标题用来检查悬停时能否滚出省略号后面的文字</span></span></div></div>'
    document.body.append(host)
    const row = host.querySelector('#scroll-session')
    const text = host.querySelector('#scroll-session .dcu-wb-session-title-text')
    row.classList.add('dcu-wb-menu-open')
    const style = getComputedStyle(text)
    if (!style.animationName.includes('dcu-wb-title-scroll')) throw new Error(`截断标题在悬停等价态必须滚动: ${style.animationName}`)
    const wrap = host.querySelector('#scroll-session .dcu-wb-session-title')
    wrap.removeAttribute('data-overflow')
    row.classList.remove('dcu-wb-menu-open')
    const overflow = text.scrollWidth - wrap.clientWidth
    if (overflow <= 1) throw new Error(`长标题必须测得出溢出: scroll=${text.scrollWidth} client=${wrap.clientWidth}`)
    results.push({ name: '会话标题悬停滚动', error: 0, scrollError: 0 })
  }
  return results
}
const bootStyles = JSON.stringify(styles.join('\n') + '\nbody{margin:0;font-family:Arial;background:#ddd}h3{font-size:13px}.dark{--dcu-sidebar-primary:#b9bab9;--dcu-sidebar-secondary:#909191;--dcu-sidebar-tertiary:#707874;--dcu-sidebar-hover:#303432;background:#1d2120;color:#b9bab9}.light{--dcu-sidebar-primary:#303432;--dcu-sidebar-secondary:#606563;--dcu-sidebar-tertiary:#767e7a;--dcu-sidebar-hover:#dfe8e5;background:#eef7f5;color:#303432}.dcu-wb{--dsw-alias-state-business-primary:#69a7ff}')
const script = `(async()=>{document.head.innerHTML='<meta charset="utf-8">';const style=document.createElement('style');style.textContent=${bootStyles} ;document.head.append(style);${implementation};return (${verify.toString()})();})()`
const verifyReducedTitle = () => {
  document.body.innerHTML = '<div class="dark" style="width:275px"><div class="dcu-wb"><div class="dcu-wb-session dcu-wb-menu-open" id="scroll-session"><span class="dcu-wb-session-title" data-overflow style="--dcu-title-shift:80px;--dcu-title-duration:2000ms"><span class="dcu-wb-session-title-text">很长的会话标题用来检查悬停时能否滚出省略号后面的文字</span></span></div></div></div>'
  const text = document.querySelector('#scroll-session .dcu-wb-session-title-text')
  const style = getComputedStyle(text)
  if (style.animationName !== 'none') throw new Error(`减动效不得滚动标题: ${style.animationName}`)
  if (style.textOverflow !== 'ellipsis') throw new Error(`减动效必须保持省略号: ${style.textOverflow}`)
  return { name: '减动效标题省略', error: 0, scrollError: 0 }
}
const reducedScript = `(async()=>{document.head.innerHTML='<meta charset="utf-8">';const style=document.createElement('style');style.textContent=${bootStyles};document.head.append(style);return (${verifyReducedTitle.toString()})();})()`
if (process.argv.includes('--run')) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const results = await page.evaluate(script)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await page.evaluate(reducedScript)
    console.log(`工作区布局：${results.length + 1} 组 Chromium 几何与样式检查通过（无截图）。`)
    if (reduced.name !== '减动效标题省略') throw new Error('减动效检查未执行')
  } finally { await browser.close() }
} else console.log(script)
