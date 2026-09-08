/** Codex 设置页的局部 tokens 与布局，不覆盖宿主其他弹窗。 */
export const settingsPageStyles = `
.dcu-settings-page{--sp-bg:#fff;--sp-nav:#f5f5f5;--sp-card:#fafafa;--sp-border:#e5e5e5;--sp-text:#303030;--sp-muted:#737373;--sp-hover:#e9e9e9;--sp-active:#e4e4e4;position:fixed;inset:0;z-index:1000;display:grid;grid-template-columns:240px minmax(0,1fr);background:var(--sp-bg);color:var(--sp-text);font:14px/1.5 var(--dcu-font,system-ui);text-align:left;isolation:isolate}
body[data-ds-dark-theme] .dcu-settings-page{--sp-bg:#181818;--sp-nav:#202322;--sp-card:#232323;--sp-border:#333;--sp-text:#dedede;--sp-muted:#a1a1a1;--sp-hover:#292c2b;--sp-active:#303332;color-scheme:dark}
.dcu-settings-page *{box-sizing:border-box}
.dcu-settings-page button,.dcu-settings-page input{font:inherit}
.dcu-settings-page button{cursor:pointer}
.dcu-settings-page :focus-visible{outline:2px solid #459cff;outline-offset:3px}
.dcu-settings-nav{display:flex;flex-direction:column;min-height:0;padding:18px 8px;background:var(--sp-nav);border-right:1px solid var(--sp-border);overflow-y:auto}
.dcu-settings-back{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:0;border-radius:7px;background:transparent;color:var(--sp-text);text-align:left}
.dcu-settings-back:hover,.dcu-settings-link:hover{background:var(--sp-hover)}
.dcu-settings-search{display:flex;align-items:center;gap:8px;padding:5px 9px;margin:12px 0 18px;background:var(--sp-hover);border:1px solid transparent;border-radius:8px;color:var(--sp-muted)}
.dcu-settings-search:focus-within{border-color:#459cff}
.dcu-settings-search input{width:100%;min-width:0;border:0;background:transparent;color:var(--sp-text);outline:none;font-size:13px}
.dcu-settings-search input[type=search]{appearance:none;padding:0;border-radius:0;box-shadow:none;line-height:20px}
.dcu-settings-search input:focus,.dcu-settings-search input:focus-visible{outline:none;box-shadow:none}
.dcu-settings-search input::placeholder{color:var(--sp-muted)}
.dcu-settings-group{margin:0 0 22px}
.dcu-settings-group-label{margin:0 8px 6px;color:var(--sp-muted);font-size:12px;font-weight:500}
.dcu-settings-link{display:flex;align-items:center;gap:9px;min-height:32px;width:100%;padding:5px 9px;border:0;border-radius:8px;background:transparent;color:var(--sp-text);text-align:left;font-size:14px!important}
.dcu-settings-link[aria-current=page]{background:var(--sp-active)}
.dcu-settings-link svg{flex:none;opacity:.9}
.dcu-settings-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-settings-empty{padding:8px;color:var(--sp-muted);font-size:13px}
.dcu-settings-main{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--sp-bg);scrollbar-width:thin;scrollbar-color:var(--sp-border) transparent}
.dcu-settings-inner{width:min(100%,864px);margin:0 auto;padding:32px 48px}
.dcu-settings-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}
.dcu-settings-heading h1{margin:0;font-size:24px;line-height:32px;font-weight:600;letter-spacing:-.4px}
.dcu-settings-heading[data-own-title=false]{justify-content:flex-end;margin-bottom:16px}
.dcu-settings-heading:not(:has(h1,button,a,[role=button])){display:none}
.dcu-settings-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;color:var(--sp-muted)}
.dcu-settings-actions button{font-size:12px}
.dcu-settings-general-group{margin-bottom:44px}
.dcu-settings-general-group h2{margin:0 0 16px;font-size:14px;font-weight:600;color:var(--sp-text)}
.dcu-settings-card{border:1px solid var(--sp-border);border-radius:16px;background:var(--sp-card);padding:0 16px;overflow:hidden}
.dcu-settings-row+.dcu-settings-row{border-top:1px solid var(--sp-border)}
.dcu-settings-row>[data-slot]{display:contents}
.dcu-settings-row>[data-slot]>*{padding:12px 0!important;border-bottom:0!important;margin:0!important;min-width:0}
.dcu-settings-row button{font-size:13px;border-radius:8px}
.dcu-settings-row input{max-width:100%}
.dcu-settings-trigger{appearance:none;box-sizing:border-box;display:flex;align-items:center;border:0;border-radius:8px;background:transparent;color:var(--dcu-sidebar-navigation,inherit);height:36px;min-height:36px;padding:0 4px;width:100%;font:400 14px/20px var(--dcu-font,system-ui);text-align:left;cursor:pointer;transition:background-color 160ms ease,color 160ms ease,transform 120ms ease}
.dcu-settings-trigger-content{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-width:0}
.dcu-settings-trigger-content svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon,currentColor);transition:transform 220ms cubic-bezier(.16,1,.3,1)}
.dcu-settings-trigger:hover{background:var(--dcu-sidebar-hover,rgba(127,127,127,.12));color:var(--dcu-sidebar-primary,inherit)}
.dcu-settings-trigger:hover svg{transform:rotate(18deg)}
.dcu-settings-trigger:active{transform:scale(.98)}
.dcu-settings-trigger:focus-visible{outline:2px solid #459cff;outline-offset:2px;background:var(--dcu-sidebar-hover,rgba(127,127,127,.12))}
.dcu-settings-trigger[data-wide=false]{justify-content:center;width:36px;padding:0!important}
.dcu-settings-trigger[data-wide=false] .dcu-settings-trigger-content{grid-template-columns:16px;justify-content:center}
.dcu-settings-page{animation:dcu-settings-enter 180ms ease-out}
.dcu-settings-nav{animation:dcu-settings-nav-enter 220ms cubic-bezier(.16,1,.3,1)}
.dcu-settings-inner{animation:dcu-settings-content-enter 240ms cubic-bezier(.16,1,.3,1)}
.dcu-settings-back,.dcu-settings-link{transition:background-color 160ms ease,color 160ms ease}
@keyframes dcu-settings-enter{from{opacity:0}to{opacity:1}}
@keyframes dcu-settings-nav-enter{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes dcu-settings-content-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.dcu-settings-trigger,.dcu-settings-trigger-content svg,.dcu-settings-back,.dcu-settings-link{transition:none}.dcu-settings-trigger:hover svg,.dcu-settings-trigger:active{transform:none}.dcu-settings-page,.dcu-settings-nav,.dcu-settings-inner{animation:none}}
.dcu-settings-page [data-slot="settings.section"]{min-width:0}
.dcu-settings-inner:has(.dcu-connector-frame){height:100%;display:flex;flex-direction:column}
.dcu-settings-inner:has(.dcu-connector-frame)>.dcu-settings-heading{flex:none}
.dcu-settings-page .dcu-connectors:has(>.dcu-connector-frame){display:flex;flex-direction:column;flex:1 1 0;min-height:0}
.dcu-settings-page .dcu-connector-frame{flex:1 1 0;min-height:0;height:100%}

@media(max-width:900px){.dcu-settings-page{grid-template-columns:200px minmax(0,1fr)}.dcu-settings-inner{padding:24px 28px}.dcu-settings-heading{align-items:flex-start;flex-direction:column;gap:12px}}
@media(max-width:600px){.dcu-settings-page{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.dcu-settings-nav{padding:8px 12px;max-height:220px;border-right:0;border-bottom:1px solid var(--sp-border)}.dcu-settings-search{margin:6px 0}.dcu-settings-groups{display:flex;gap:8px;overflow-x:auto;flex:none}.dcu-settings-group{display:flex;gap:4px;margin:0;flex:none}.dcu-settings-group-label{display:none}.dcu-settings-link{width:auto;min-height:40px;flex:none}.dcu-settings-inner{padding:24px 16px}.dcu-settings-heading{margin-bottom:28px}.dcu-settings-heading h1{font-size:22px}.dcu-settings-card{padding:0 12px}.dcu-settings-row>[data-slot]>*{flex-wrap:wrap;gap:12px!important}.dcu-settings-general-group{margin-bottom:32px}}
`
