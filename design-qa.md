# 频道与定时胶囊一致性验收

更新时间：2026-09-07 09:32（Asia/Shanghai）

## 对照目标

- 视觉基准：`C:\Users\YUJIYU\AppData\Local\Temp\codex-clipboard-3a8f2247-839e-4583-8952-10d5cbca99ee.png`（任务，258×109）。
- 问题截图：`C:\Users\YUJIYU\AppData\Local\Temp\codex-clipboard-b1c135cf-8a7c-4b35-b495-8456117ce547.png`（频道，266×102）与 `C:\Users\YUJIYU\AppData\Local\Temp\codex-clipboard-fcee3455-31e0-4dbd-8419-01419482de7d.png`（定时，275×97）。
- 实现截图与同屏对照：[03-胶囊间距对比.png](docs/01-当前工作/I001-Codex-风格界面/03-胶囊间距对比.png)（531×340；左侧为用户截图，右侧为修复后频道与定时局部截图）。
- 浏览器与状态：Codex 内置浏览器，DSH Web 深色主题，任务、频道、定时均展开；频道和定时分别检查首条及后续会话。
- 视口：1080×1320 CSS px，`devicePixelRatio = 1`；局部实现截图按 1:1 CSS 像素裁切，无密度缩放。

## 对比结果

- 全视图：三个页签均可切换，频道和定时列表没有横向溢出，滚动区域与页脚未受影响；控制台无 error 或 warning。
- 局部几何：任务、频道、定时的分组头和会话行均为 30px 高、10px 圆角；分组头到首条会话均为 4px，后续会话间距仍为 2px。
- 字体与排版：继续复用 `WORKSPACE_TREE_STYLE` 和 `SessionRow`，字号、行高、字重、截断与标题缩进未改变。
- 间距与布局：频道、定时补齐 `.dcu-wb-project-body`，首行命中任务树既有的 `margin-top: 4px` 规则。
- 颜色与令牌：未新增颜色，悬停、选中和文字仍使用原侧栏语义令牌。
- 图像与图标：未新增或替换资产，频道品牌图标、定时图标和操作图标保持原实现。
- 文案：未修改用户可见文案。

## Findings

无剩余 P0、P1 或 P2 差异。

## Comparison History

1. 初始 P2：频道和定时将 `SessionRow` 直接渲染在 `GroupHead` 后，未进入 `.dcu-wb-project-body`；两个 30px 胶囊之间没有任务树已有的 4px 层级间距，视觉上连成一体。
2. 修复：两棵树仅补齐任务树同款内容容器，并增加结构回归断言。
3. 修复后证据：频道测得分组头 30px、首行 30px、间距 4px；定时测得分组头 30px、首行 30px、间距 4px、后续间距 2px。未发现新的可操作差异。

## Implementation Checklist

- [x] 频道首行复用任务树层级间距。
- [x] 定时首行复用任务树层级间距。
- [x] 页签切换与列表滚动正常。
- [x] 回归断言、类型检查和浏览器视觉验收通过。

final result: passed

---

# 配套插件版本与在线更新验收

更新时间：2026-09-07 10:18（Asia/Shanghai）

## 对照目标

- 视觉基准：`C:\Users\YUJIYU\AppData\Local\Temp\codex-clipboard-8c8d66cb-e13e-4c50-a44d-d8cca38de0fb.png`（994×816），用于更新信息层级、手工命令和操作区参考；该图中的 DSH-IM 不是目标插件。
- 标题区基准：用户提供的 Codex UI、专家、技能、归档和定时任务设置页截图；实际 IM 目标为 `@michengai/dsh-im-connect` 的“IM机器人”页。
- 实现：`src/client/companion-updates.ts`；Codex 内置浏览器打开 `C:\Users\YUJIYU\.codex\visualizations\2026\09\07\01a07970-a3f4-7422-82ec-d885e02bb463\companion-updates-compare.html`，将参考图与真实 DOM 预览置于同一 1080×1320 CSS px 画面比较。
- 密度：浏览器 `devicePixelRatio = 1`；参考图在左侧容器内等比缩放，右侧实现 iframe 从 1080×1320 等比缩放。另单独检查实现原始 1080×1320 画面，以排除对照缩放导致的误判。
- 状态：深色设置页，IM 插件已安装，运行版本 `0.1.8`，发现 `0.1.9`，目标 profile 为 `web`，自动更新可用。

## 对比结果

- 全视图：版本号位于标题基线右侧，GitHub、问题反馈、检查更新按顺序排列；弹窗在设置页上方居中显示，背景遮罩和宿主层级清晰。
- 聚焦区域：弹窗包含运行版本、目标 profile、版本检测状态、手工更新命令、复制命令、关闭、重新检查和自动更新；自动更新完成后显示 Web 手动重启提示。
- 字体与排版：标题、辅助版本、正文、状态和等宽命令形成与参考图一致的层级，没有标题或按钮文字溢出。
- 间距与布局：720px 弹窗在 1080px 视口内左右各留 180px；页面与弹窗的 `body.scrollWidth` 均为 1080px，命令区没有扩大页面宽度。
- 颜色与令牌：控件继续复用 DSH 的 label、border、hover、business、success 和 error 语义令牌；无新增渐变或装饰资产。
- 图像与图标：本次没有新增图片资产；既有 GitHub 和反馈图标由各插件保留，更新入口不替换原图标。
- 文案：中英文均覆盖检查、最新版本、新版本、手工更新、复制、自动更新和重启状态；归档菜单和页面标题统一为“归档会话 / Archived sessions”。
- 交互与控制台：检查更新、重新检查和自动更新状态已实际操作；浏览器控制台无 error 或 warning。

## Findings

无剩余 P0、P1 或 P2 差异。

## Comparison History

1. 初始参考只展示独立更新页，目标产品要求点击标题区按钮后弹窗显示；实现保留参考图的信息层级，同时采用宿主设置页内的模态交互。
2. 首轮实现将长手工命令放入可横向滚动的等宽区域，并保持复制按钮固定可见；原始视口测得命令容器 `clientWidth` 与 `scrollWidth` 均为 676px，页面无横向溢出。
3. 自动更新完成状态复验显示“请手动重启 DSH Web”，与接口返回的 `autoReload: false` 一致；控制台仍为空。

## Implementation Checklist

- [x] Codex UI 标题显示实际版本且不重复增加更新入口。
- [x] 五个配套插件显示版本，并在问题反馈右侧提供检查更新。
- [x] 弹窗覆盖检测、自动更新、手工命令、复制、重新检查与重启提示。
- [x] 归档菜单和页面标题统一命名。
- [x] 类型检查、回归测试、构建和浏览器视觉验收完成。

final result: passed
