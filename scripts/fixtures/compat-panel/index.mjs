/** 仅安装到端到端测试的隔离 profile；静态事件不调用模型。 */
export function apply(ctx) {
  ctx.on('session/created', session => {
    if (!(session.header.cwd ?? '').replaceAll('\\', '/').endsWith('/visual')) return
    for (let turn = 1; turn <= 3; turn++) {
      session.append('turn/start', { turn })
      session.append('user/message', { id: `visual-${turn}`, role: 'user', content: [{ type: 'text', text: `视觉回归第 ${turn} 轮\n` + '这是一条用于检查原版消息布局的长消息。'.repeat(80) }], source: { kind: 'user' } }, { surfaceOp: 'append' })
      session.append('turn/end', { turn, reason: { kind: 'completed' } })
    }
  })
}
