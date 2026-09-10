window.__ModuleLoader__.load({ id: 'dcu-compat-panel-fixture', factory: require => {
  const React = require('react')
  return {
    inject: ['slots', 'layout', 'conversation', 'sessions', 'workspaces', 'locale'],
    apply(ctx) {
      let removePanel
      const add = () => {
        if (removePanel) return
        removePanel = ctx.slots.inject('sidebar.panellist', function* () {
          yield ctx.slots.register({ name: 'sidebar.panellist', id: 'dcu-e2e', label: '兼容测试面板', order: -100 }, ({ active }) => React.createElement('span', { 'data-e2e-icon': active ? 'active' : 'idle' }, '◇'))
          yield ctx.slots.register({ name: 'main', key: 'dcu-e2e' }, () => React.createElement('section', { 'data-e2e-panel': '' }, '真实宿主全局面板'))
        })
      }
      ctx.effect(() => {
        add()
        // 只提供测试准备与注册生命周期控制；交互断言通过真实 DOM 执行。
        window.__dcuE2E = { ctx, add, remove() { ctx.layout.selectPanel(null); removePanel?.(); removePanel = undefined } }
        return () => { removePanel?.(); delete window.__dcuE2E }
      })
    },
  }
} })
