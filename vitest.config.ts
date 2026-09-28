import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

/** 移除 node_modules 中引用缺失 .map 的 sourceMappingURL 注释，避免 Vite 读取失败告警。 */
const stripMissingSourcemap = {
  name: 'strip-missing-sourcemap',
  load(id: string): string | undefined {
    if (!id.includes('node_modules')) return undefined
    const file = id.split('?')[0]
    if (!file.endsWith('.js')) return undefined
    let code: string
    try {
      code = readFileSync(file, 'utf8')
    } catch {
      return undefined
    }
    return code.includes('sourceMappingURL') ? code.replace(/\/\/# sourceMappingURL=.*$/gm, '') : undefined
  },
}

export default defineConfig({
  plugins: [stripMissingSourcemap],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
    server: {
      deps: {
        // DSH 发布的客户端入口通过 ModuleLoader 装配，集成测试必须交给 Vite 转换。
        inline: true,
      },
    },
  },
})
