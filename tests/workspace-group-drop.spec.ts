import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { reorderDropBeforeId } from '../src/client/workspace-browser.ts'

// 使用真实样式检查裁剪链，避免只有落点 class 正确而蓝条仍不可见。
const source = readFileSync(resolve('src/client/CodexWorkspaceBrowser.tsx'), 'utf8')
const styles = ['stylesheet', 'runningStyles', 'typographyStyles', 'collectionLayoutStyles']
  .map(name => source.match(new RegExp(`const ${name} = \x60([^]*?)\x60`))?.[1] ?? '')
  .join('\n')

afterEach(() => { document.head.innerHTML = ''; document.body.innerHTML = '' })

describe('分组排序插入线', () => {
  function render(open: boolean, targetClass: string) {
    const style = document.createElement('style')
    style.textContent = styles
    document.head.append(style)
    document.body.innerHTML = `<div class="dcu-wb-section-body" data-open="${open}"><div class="dcu-wb-collections"><div class="dcu-wb-collection ${targetClass}"></div></div></div>`
    return document.querySelector<HTMLElement>('.dcu-wb-section-body')!
  }

  it('第二组插到第一组之前时，外层不裁掉位于顶部外侧的蓝条', () => {
    expect(reorderDropBeforeId(['first', 'second'], 'second', 'first', false)).toBe('first')
    const section = render(true, 'dcu-wb-group-order-drop')
    expect(getComputedStyle(section).overflow).toBe('visible')
  })

  it('分组末尾落点同样可见', () => {
    const section = render(true, 'dcu-wb-group-order-drop')
    section.querySelector('.dcu-wb-collection')!.classList.replace('dcu-wb-collection', 'dcu-wb-ungrouped')
    expect(getComputedStyle(section).overflow).toBe('visible')
  })

  it('没有落点或分区已收起时仍保留裁剪', () => {
    const section = render(true, '')
    expect(getComputedStyle(section).overflow).toBe('clip')
    section.querySelector('.dcu-wb-collection')!.classList.add('dcu-wb-group-order-drop')
    section.dataset.open = 'false'
    expect(getComputedStyle(section).overflow).toBe('clip')
    expect(getComputedStyle(section).height).toBe('0px')
  })

  it('拖到第一组下半区且顺序不变时，不产生无效落点', () => {
    expect(reorderDropBeforeId(['first', 'second'], 'second', 'first', true)).toBeNull()
  })
})
