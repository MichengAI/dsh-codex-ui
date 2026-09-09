/** 只使用示例数据的设置页预览；直接渲染生产组件，不连接或写入宿主。 */
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Settings } from 'lucide-react'
import { CodexGeneralSettings, CodexSettingsPage, type CodexSettingsPageProps } from '../src/client/CodexSettingsPage.tsx'
import { zh } from '../src/client/locales.ts'

const rows = [
  ['general', '常规'], ['models', '模型'], ['plugins', '插件'], ['agency-agents', '专家'], ['skills', '技能'], ['connectors', '连接器'], ['agent-presets', 'Agent 预设'], ['automation', '定时任务'], ['im-assistant', 'IM 助理'], ['market', '插件市场'], ['better-sidebar', '侧边卡片'], ['archive', '归档会话'], ['about', 'Codex UI'],
].map(([id, label], order) => ({ id, label, order }))
const items = ['default-permission', 'language', 'appearance', 'font-size', 'conversation-display', 'composer-enter'].map(id => ({ id }))
const source = <T,>(value: readonly T[]) => ({ getSnapshot: () => value, subscribe: () => () => {} })
const definitions: Record<string, [string, string, string[]]> = {
  'default-permission': ['默认权限', '选择新会话的默认权限模式。', ['工作区内修改', '只读', '完全访问']],
  language: ['语言', '应用 UI 语言', ['中文', 'English']],
  appearance: ['主题', '选择浅色、深色或跟随系统。', ['深色', '浅色', '跟随系统']],
  'font-size': ['字号大小', '调整会话内容的文字大小。', ['14 px', '16 px', '18 px']],
  'conversation-display': ['对话显示', '控制已完成轮次的过程内容。', ['紧凑', '完整']],
  'composer-enter': ['繁忙时 Enter 键行为', '智能体运行时，选择后续消息的处理方式。', ['排队发送', '调整方向']],
}
function PreviewRow({ id }: { id: string }) {
  const [label, description, options] = definitions[id]
  const [value, setValue] = useState(options[0])
  return <div className="preview-row"><div><strong>{label}</strong><p>{description}</p></div><select aria-label={label} value={value} onChange={event => { setValue(event.target.value); if (id === 'appearance') { document.body.toggleAttribute('data-ds-dark-theme', event.target.value !== '浅色') } }}>{options.map(option => <option key={option}>{option}</option>)}</select></div>
}
function App() {
  useEffect(() => { document.querySelector<HTMLButtonElement>('[data-dcu-settings-trigger]')?.click() }, [])
  const t = (key: keyof typeof zh) => zh[key]
  const [saved, setSaved] = useState(false)
  const renderSlot: CodexSettingsPageProps['renderSlot'] = (name, owner, options) => {
    if (name === 'settings.trigger') return <span className="dcu-settings-trigger-content"><Settings size={16} strokeWidth={1.6}/><span>设置</span></span>
    if (name !== 'settings.section') return null
    if (options?.only === 'general') return <CodexGeneralSettings items={source(items)} t={t} renderSlot={(name, _owner, item) => name === 'settings.general.item' ? <div data-slot="settings.general.item"><PreviewRow id={item!.only!}/></div> : null}/>
    if (options?.only === 'models') return <section className="dcu-settings-general-group"><h2>默认模型</h2><div className="dcu-settings-card"><div className="preview-row"><div><strong>模型</strong><p>用于新会话的默认模型。</p></div><select aria-label="模型"><option>deepseek-chat</option><option>deepseek-reasoner</option></select></div><div className="preview-row"><div><strong>配置状态</strong><p>{saved ? '已保存到当前预览' : '仅预览，不连接模型服务'}</p></div><button onClick={() => { setSaved(true) }}>保存</button></div></div></section>
    return <section className="dcu-settings-general-group"><h2>{rows.find(row => row.id === options?.only)?.label}</h2><div className="dcu-settings-card"><div className="preview-row"><div><strong>此页面由对应插件提供</strong><p>当前为布局预览，实际应用会加载已安装插件的原有功能。</p></div></div></div></section>
  }
  return <><style>{`html,body,#root{margin:0;height:100%;font-family:Inter,"Segoe UI","Microsoft YaHei UI",sans-serif}body{background:#181818;color:#dedede}.preview-app{padding:24px}.preview-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;font-size:14px}.preview-row strong{font-weight:500}.preview-row p{margin:2px 0 0;color:var(--sp-muted);font-size:12px;line-height:1.5}.preview-row select,.preview-row button{flex:none;max-width:50%;border:1px solid var(--sp-border);border-radius:8px;background:var(--sp-hover);color:var(--sp-text);padding:4px 10px;font:13px/20px inherit}.preview-app>p{color:#aaa;font-size:13px}@media(max-width:600px){.preview-row{gap:16px}.preview-row select{max-width:100%}}`}</style><div className="preview-app"><h2>Codex UI 设置预览</h2><p>使用示例数据，不会修改应用配置。</p><textarea aria-label="会话草稿" defaultValue="返回后仍保留的会话草稿"/></div><CodexSettingsPage {...({ wide: true, sections: source(rows), onboarding: source([]), connectionState: { getSnapshot: () => 'connected', subscribe: () => () => {} }, reconnect: () => {}, useSessions: (selector: (value: object) => unknown) => selector({ phase: 'ready', byId: {} }), renderSlot, t } as CodexSettingsPageProps)}/></>
}
createRoot(document.getElementById('root')!).render(<App/> )
