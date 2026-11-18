/**
 * Codex 风格项目选择器样式。
 *
 * 对齐参考截图：白色圆角浮层 + 顶部搜索行 + 文件夹列表 + 底部「新建项目」，
 * 列表溢出时底部做渐隐遮罩（最后一行慢慢淡出），当前项目用极浅的灰底胶囊高亮。
 * 颜色全部走宿主主题令牌，浅色 / 深色 / 玻璃主题都自动适配。
 */
export const WORKSPACE_PICKER_STYLE = `
.dcu-wsp-panel{
  position:fixed;
  z-index:1100;
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  width:min(266px,calc(100vw - 16px));
  padding:4px;
  border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);
  border-radius:16px;
  background:var(--dsw-alias-bg-layer-1);
  color:var(--dsw-alias-label-primary);
  box-shadow:0 16px 40px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.06);
  font:13px/20px var(--dsw-font-family);
  -webkit-font-smoothing:antialiased;
  outline:none;
  animation:dcu-wsp-in 120ms ease-out;
}
@keyframes dcu-wsp-in{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
.dcu-wsp-search{display:flex;align-items:center;gap:6px;height:30px;flex:none;padding:0 6px;color:var(--dsw-alias-label-tertiary)}
.dcu-wsp-search>svg{width:14px;height:14px;flex:none}
.dcu-wsp-input{flex:1;min-width:0;height:100%;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;outline:none}
.dcu-wsp-input::placeholder{color:var(--dsw-alias-label-tertiary);opacity:1}
.dcu-wsp-panel .dcu-wsp-input:focus,.dcu-wsp-panel .dcu-wsp-input:focus-visible{outline:none}
.dcu-wsp-divider{flex:none;height:1px;margin:4px 6px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.dcu-wsp-list{position:relative;display:flex;flex-direction:column;min-height:0;padding:0 4px}
.dcu-wsp-scroll{display:flex;flex-direction:column;min-height:0;max-height:203px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.dcu-wsp-scroll::-webkit-scrollbar{display:none}
.dcu-wsp-thumb{position:absolute;top:0;right:1px;width:6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);pointer-events:auto;cursor:default;touch-action:none;transition:background-color 120ms}
.dcu-wsp-thumb:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
.dcu-wsp-item{appearance:none;display:flex;align-items:center;gap:6px;flex:none;width:100%;height:29px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;white-space:nowrap;cursor:pointer;overflow:hidden}
.dcu-wsp-item>svg{width:16px;height:16px;flex:none;color:inherit;opacity:.9}
.dcu-wsp-item[data-active=true],.dcu-wsp-item[aria-selected=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.dcu-wsp-item:disabled{opacity:.45;cursor:default}
.dcu-wsp-title{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wsp-create{height:32px;font-weight:500}
.dcu-wsp-status{padding:12px 10px;color:var(--dsw-alias-label-tertiary)}
.dcu-wsp-error{padding:6px 10px 2px;color:var(--dsw-alias-state-warn-label,#d94838);font-size:12px;line-height:18px;word-break:break-word}
.dcu-wsp-spin{box-sizing:border-box;width:14px;height:14px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent);border-top-color:var(--dsw-alias-label-primary);animation:dcu-wsp-spin .8s linear infinite}
@keyframes dcu-wsp-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.dcu-wsp-panel{animation:none}.dcu-wsp-spin{animation-duration:2.4s}}
`
