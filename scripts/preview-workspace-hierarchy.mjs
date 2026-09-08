/** 用源码中的实际样式生成独立的三层树对照页；示例数据不接入宿主。 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChevronRight, Folder, FolderOpen, Ellipsis, Sun } from 'lucide-react'

const root = resolve(import.meta.dirname, '..')
const target = process.argv[2]
if (!target) throw new Error('请提供预览 HTML 的输出路径。')
const sourcePath = 'src/client/CodexWorkspaceBrowser.tsx'
const current = readFileSync(resolve(root, sourcePath), 'utf8')
const previous = execFileSync('git', ['show', `HEAD:${sourcePath}`], { cwd: root, encoding: 'utf8' })
function styles(source, names) {
  const file = ts.createSourceFile('preview.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = new Map()
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && ts.isNoSubstitutionTemplateLiteral(declaration.initializer)) {
        found.set(declaration.name.text, declaration.initializer.text)
      }
    }
  }
  return names.map(name => {
    if (!found.has(name)) throw new Error(`缺少样式 ${name}`)
    return found.get(name)
  }).join('\n')
}
const names = ['stylesheet', 'runningStyles', 'typographyStyles', 'collectionLayoutStyles']
const theme = styles(readFileSync(resolve(root, 'src/client/CodexSidebar.tsx'), 'utf8'), ['stylesheet'])
const icon = (component, size = 16) => renderToStaticMarkup(React.createElement(component, { size, strokeWidth: 1.5, 'aria-hidden': true }))
const caret = `<span class="dcu-wb-section-caret" aria-hidden="true">${icon(ChevronRight, 12)}</span>`
const more = '<span class="dcu-wb-collection-actions"><button class="dcu-wb-more" title="分组操作" aria-label="分组操作">' + icon(Ellipsis) + '</button></span>'
function project(title, sessions, open = true) {
  return `<div class="dcu-wb-group-member"><div class="dcu-wb-project"><div role="treeitem" tabindex="0" class="dcu-wb-project-head" aria-expanded="${open}"><span class="dcu-wb-folder">${icon(Folder)}</span><span class="dcu-wb-project-title">${title}</span></div><div class="dcu-wb-project-body" data-open="${open}">${sessions.map((title, i) => `<div role="treeitem" tabindex="0" aria-selected="false" class="dcu-wb-session"><span class="dcu-wb-session-title">${title}</span>${i === 1 ? '<span class="dcu-wb-unread" aria-label="未读"></span>' : ''}</div>`).join('')}</div></div></div>`
}
function group(title, body, count, open = true, ungrouped = false) {
  return `<div class="${ungrouped ? 'dcu-wb-ungrouped' : 'dcu-wb-collection'}"><div class="dcu-wb-collection-head"><button class="dcu-wb-collection-label" aria-expanded="${open}">${caret}<span class="dcu-wb-collection-title">${title}</span><span class="dcu-wb-collection-count">${count}</span></button>${ungrouped ? '<span class="dcu-wb-collection-actions"></span>' : more}</div><div class="dcu-wb-collection-body" data-open="${open}">${body}</div></div>`
}
const tree = group('代码评审', project('支付网关', ['梳理订单回调的幂等逻辑', '修复退款状态同步']) + project('管理后台', ['权限菜单与角色配置'], false), 2)
  + group('自媒体创作', project('公众号选题', ['整理本周 AI 产品观察']), 1)
  + group('一个用于检查窄侧栏截断的超长分组名称', project('文档归档', ['设计规范']), 1, false)
  + group('未分组', project('临时工作区', ['讨论下一版界面'], false), 1, true, true)
const interaction = `document.addEventListener('click',e=>{const label=e.target.closest('.dcu-wb-collection-label,.dcu-wb-project-head');if(label){const open=label.getAttribute('aria-expanded')!=='true';label.setAttribute('aria-expanded',String(open));const body=label.classList.contains('dcu-wb-collection-label')?label.parentElement.nextElementSibling:label.nextElementSibling;body.dataset.open=String(open)}const session=e.target.closest('.dcu-wb-session');if(session){document.querySelectorAll('.dcu-wb-session').forEach(el=>{el.classList.remove('dcu-wb-selected');el.setAttribute('aria-selected','false')});session.classList.add('dcu-wb-selected');session.setAttribute('aria-selected','true');session.querySelector('.dcu-wb-unread')?.remove()}});document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=treeitem]')){e.preventDefault();e.target.click()}});window.addEventListener('message',e=>{if(e.data?.theme==='light')document.body.removeAttribute('data-ds-dark-theme');if(e.data?.theme==='dark')document.body.setAttribute('data-ds-dark-theme','')});`
function frame(source) {
  const statefulFolders = source === current
  const folderStyles = statefulFolders ? '.dcu-wb-project-head[aria-expanded=true] .preview-folder-closed,.dcu-wb-project-head[aria-expanded=false] .preview-folder-open{display:none}' : '.preview-folder-open{display:none}'
  const previewTree = tree.replaceAll(icon(Folder), `<span class="preview-folder-closed">${icon(Folder)}</span><span class="preview-folder-open">${icon(FolderOpen)}</span>`)
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>${theme}\n${styles(source, names)}\n${folderStyles}\nhtml,body{margin:0;height:100%}.dcu-root{padding:16px 8px}.dcu-wb{width:100%}.dcu-wb-section-head{margin-bottom:8px}.dcu-wb-collection-head{margin:0}.dcu-wb-collection-body{transition:none}</style><body data-ds-dark-theme><div class="dcu-root"><section class="dcu-wb"><div class="dcu-wb-section-head"><span class="dcu-wb-section-label">项目</span></div><div class="dcu-wb-tree" role="tree"><div class="dcu-wb-collections">${previewTree}</div></div></section></div><script>${interaction}</script></body></html>`
}
const escapeAttribute = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>工作区层级对照</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f4f5f6;color:#27292b;font:14px/1.5 "Segoe UI","Microsoft YaHei UI",sans-serif;letter-spacing:0}header{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px}h1{font-size:18px;margin:0}button{display:grid;place-items:center;width:32px;height:32px;border:1px solid #ccd0d2;background:white;border-radius:6px;cursor:pointer}input{width:120px}main{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}section{width:min(var(--width,275px),100%)}h2{font-size:13px;font-weight:500;margin:0 0 8px}iframe{display:block;width:100%;height:650px;border:1px solid #d3d6d5;border-radius:6px}@media(max-width:600px){body{padding:16px}main{gap:16px}}</style><header><h1>工作区层级对照</h1><button id="theme" title="切换深浅主题" aria-label="切换深浅主题">${icon(Sun)}</button><label>侧栏宽度 <input type="range" min="240" max="520" value="275" id="width"><output>275px</output></label><span>示例数据</span></header><main><section><h2>当前版本</h2><iframe title="当前版本" srcdoc="${escapeAttribute(frame(previous))}"></iframe></section><section><h2>三层优化</h2><iframe title="三层优化" srcdoc="${escapeAttribute(frame(current))}"></iframe></section></main><script>let dark=true;document.querySelector('#theme').onclick=()=>{dark=!dark;document.querySelectorAll('iframe').forEach(f=>f.contentWindow.postMessage({theme:dark?'dark':'light'},'*'))};document.querySelector('#width').oninput=e=>{document.documentElement.style.setProperty('--width',e.target.value+'px');document.querySelector('output').value=e.target.value+'px'};</script></html>`
mkdirSync(dirname(resolve(target)), { recursive: true })
writeFileSync(target, html, 'utf8')
console.log(resolve(target))
