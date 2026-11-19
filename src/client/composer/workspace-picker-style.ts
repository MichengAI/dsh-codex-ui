/**
 * Codex 风格项目选择器样式。
 *
 * 只负责尺寸、排布与选中态：浮层材质（材质层、圆角、描边、阴影、层级、进出场动画）
 * 由宿主 `MenuSurface` 提供，菜单行与搜索框分别由宿主 `MenuItemButton` / `Input`
 * 渲染，配色全部走宿主主题令牌，浅色 / 深色 / 玻璃主题自动适配。
 */
export const WORKSPACE_PICKER_STYLE = `
.dcu-wsp-panel{
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  width:min(266px,calc(100vw - 16px));
  padding:4px;
}
.dcu-wsp-search{width:100%;margin-bottom:4px}
.dcu-wsp-scroll{display:flex;flex-direction:column;min-height:0;max-height:203px;overflow-y:auto;overscroll-behavior:contain;padding:0 4px}
.dcu-wsp-row{flex:none}
.dcu-wsp-row[data-active=true] [role=menuitem],
.dcu-wsp-create[data-active=true] [role=menuitem]{background:var(--dsw-alias-interactive-bg-hover)}
.dcu-wsp-body{display:flex;align-items:center;gap:6px;min-width:0;width:100%}
.dcu-wsp-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wsp-suffix{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:inherit}
.dcu-wsp-check{margin-left:auto;flex:none;opacity:.85}
.dcu-wsp-create{flex:none}
.dcu-wsp-status{padding:12px 10px;color:var(--dsw-alias-label-tertiary)}
.dcu-wsp-error{padding:6px 10px 2px;color:var(--dsw-alias-state-warn-label,#d94838);font-size:12px;line-height:18px;word-break:break-word}
.dcu-wsp-spin{box-sizing:border-box;width:14px;height:14px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent);border-top-color:var(--dsw-alias-label-primary);animation:dcu-wsp-spin .8s linear infinite}
@keyframes dcu-wsp-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.dcu-wsp-spin{animation-duration:2.4s}}
`
