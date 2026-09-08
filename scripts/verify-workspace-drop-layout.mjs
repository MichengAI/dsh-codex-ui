/** 输出浏览器几何验收脚本；通过 agent-browser eval --stdin 执行，不接入用户数据。 */
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
      // 保留静态截图证据，同时结束持续帧监听。
      const copy = line.cloneNode(true)
      dispose()
      root.dataset.dropIndicator = 'measured'
      root.append(copy)
    }
  }
  return results
}
console.log(`(async()=>{document.head.innerHTML='<meta charset="utf-8">';const style=document.createElement('style');style.textContent=${JSON.stringify(styles.join('\n') + '\nbody{margin:0;font-family:Arial;background:#ddd}h3{font-size:13px}.dark{--dcu-sidebar-primary:#b9bab9;--dcu-sidebar-secondary:#909191;--dcu-sidebar-hover:#303432;background:#1d2120;color:#b9bab9}.light{--dcu-sidebar-primary:#303432;--dcu-sidebar-secondary:#606563;--dcu-sidebar-hover:#dfe8e5;background:#eef7f5;color:#303432}.dcu-wb{--dsw-alias-state-business-primary:#69a7ff}')} ;document.head.append(style);${implementation};return (${verify.toString()})();})()`)
