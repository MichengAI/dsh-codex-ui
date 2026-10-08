import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChannelBrandIcon } from '../src/client/channel-brand.tsx'

describe('频道品牌图标', () => {
  it.each([
    ['discord', ['#5865F2']],
    ['slack', ['#E01E5A', '#36C5F0', '#2EB67D', '#ECB22E']],
    [' Discord ', ['#5865F2']],
    [' SLACK ', ['#E01E5A', '#36C5F0', '#2EB67D', '#ECB22E']],
  ])('%s 显示品牌路径而非灰色占位圆', (id, colors) => {
    const markup = renderToStaticMarkup(createElement(ChannelBrandIcon, { id }))
    const container = document.createElement('div')
    container.innerHTML = markup
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('16')
    expect(svg.getAttribute('height')).toBe('16')
    expect(svg.querySelector('circle')).toBeNull()
    expect(svg.querySelectorAll('path')).toHaveLength(colors.length)
    for (const color of colors) expect(svg.querySelector(`path[fill="${color}"]`)).not.toBeNull()
    expect(svg.querySelector('img, image')).toBeNull()
  })

  it('未知平台仍使用占位图标', () => {
    const markup = renderToStaticMarkup(createElement(ChannelBrandIcon, { id: 'unknown' }))
    expect(markup).toContain('<circle')
    expect(markup).toContain('#8b949e')
  })
})
