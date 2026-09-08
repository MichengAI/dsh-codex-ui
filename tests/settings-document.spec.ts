import { act, createElement } from 'react'
import { createRequire } from 'node:module'
const { createRoot } = createRequire(import.meta.url)('react-dom/client') as {createRoot: (element: HTMLElement) => {render: (node: import('react').ReactNode) => void; unmount: () => void}}
import { afterEach, expect, test, vi } from 'vitest'
import { SettingsDocumentAction } from '../src/client/SettingsDocumentAction.tsx'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import { zh } from '../src/client/locales.ts'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: ReturnType<typeof createRoot>[] = []
afterEach(async () => { await act(async () => { roots.splice(0).forEach(root => root.unmount()) }); document.body.innerHTML = '' })
async function mount(hasDocument: boolean, ensure: () => Promise<void>, openDocument = vi.fn(async () => ({ok:true}))) {
  const container=document.createElement('div'); document.body.append(container)
  const root=createRoot(container); roots.push(root)
  const snapshot={view:hasDocument ? {hasDocument:true} : undefined}
  const describe={getSnapshot:()=>snapshot,subscribe:()=>()=>{},ensure} as unknown as SettingsDescribeFace
  await act(async()=>{root.render(createElement(SettingsDocumentAction,{describe,openDocument,t:(key:keyof typeof zh)=>zh[key]} as never))})
  return {container,openDocument}
}
test('元数据加载失败时即使没有配置文件信息也显示错误',async()=>{
 const {container}=await mount(false,async()=>{throw Error('unavailable')})
 expect(container.querySelector('[role=alert]')?.textContent).toBe(zh['settings.openDocumentError'])
 expect(container.querySelector('button')).toBeNull()
})
test('无配置文件时隐藏入口，打开失败展示反馈，重试成功清除错误',async()=>{
 const empty=await mount(false,async()=>{});expect(empty.container.textContent).toBe('')
 const open=vi.fn().mockRejectedValueOnce(Error('failed')).mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true})
 const {container}=await mount(true,async()=>{},open)
 for(let i=0;i<3;i++){await act(async()=>{container.querySelector('button')!.click()});expect(container.querySelector('[role=alert]')!==null).toBe(i<2)}
 expect(open).toHaveBeenCalledTimes(3)
})
