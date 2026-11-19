/**
 * Codex 风格项目选择器样式。
 *
 * 材质层（半透明底、圆角、backdrop、进出场）由宿主 `MenuSurface` 提供，菜单行由
 * 宿主 `MenuItemButton` 渲染。这里补两件宿主菜单列表本来会做、只挂 `MenuSurface`
 * 会漏掉的事：
 * 1. 卡片高度感：宿主 `Menu` 的列表类带 `--dsw-elevation-prominent` 投影与描边环，
 *    并把滚动条 thumb 重绑到 l2 高度色（`--dsh-scrollbar-*`）；缺了这些就是一张平卡片；
 * 2. 压平宿主 `Input` 在表单语境里的描边与 2px 聚焦环——菜单里的搜索行不是表单，
 *    原样带进来会像一条错误态输入框。
 */
export const WORKSPACE_PICKER_STYLE = `
.dcu-wsp-panel{
  box-sizing:border-box;
  display:flex;
  flex-direction:column;
  width:min(266px,calc(100vw - 16px));
  padding:4px;
  --dsw-elevation-stroke-color:var(--dsw-alias-border-l1);
  box-shadow:var(--dsw-elevation-prominent);
  --dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);
}
.dcu-wsp-panel .dcu-wsp-search.dcu-wsp-search{
  box-sizing:border-box;
  width:100%;
  height:30px;
  margin-bottom:4px;
  padding:0 6px;
  border:0;
  border-bottom:1px solid var(--dsw-alias-border-l1);
  border-radius:0;
  background:transparent;
}
.dcu-wsp-panel .dcu-wsp-search.dcu-wsp-search:focus-within{border-bottom-color:var(--dsw-alias-border-l3)}
.dcu-wsp-panel .dcu-wsp-search.dcu-wsp-search input,
.dcu-wsp-panel .dcu-wsp-search.dcu-wsp-search input:focus,
.dcu-wsp-panel .dcu-wsp-search.dcu-wsp-search input:focus-visible{outline:none;box-shadow:none;background:transparent}
.dcu-wsp-scroll{display:flex;flex-direction:column;min-height:0;max-height:203px;overflow-y:auto;overscroll-behavior:contain}
.dcu-wsp-row{flex:none}
.dcu-wsp-row[data-active=true] [role=menuitem],
.dcu-wsp-create[data-active=true] [role=menuitem]{background:var(--dsw-alias-interactive-bg-hover)}
.dcu-wsp-body{display:flex;align-items:center;gap:6px;min-width:0;width:100%}
.dcu-wsp-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wsp-suffix{flex:none;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:inherit}
.dcu-wsp-check{margin-left:auto;flex:none;color:var(--dsw-alias-label-secondary)}
.dcu-wsp-create{flex:none}
.dcu-wsp-status{padding:10px 8px;color:var(--dsw-alias-label-tertiary)}
.dcu-wsp-error{padding:6px 10px 2px;color:var(--dsw-alias-state-warn-label,#d94838);font-size:12px;line-height:18px;word-break:break-word}
.dcu-wsp-spin{box-sizing:border-box;width:14px;height:14px;flex:none;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-label-primary) 22%,transparent);border-top-color:var(--dsw-alias-label-primary);animation:dcu-wsp-spin .8s linear infinite}
@keyframes dcu-wsp-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.dcu-wsp-spin{animation-duration:2.4s}}
`
