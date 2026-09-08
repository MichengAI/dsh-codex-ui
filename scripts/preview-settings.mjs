/** 编译设置页真实组件，提供仅含示例数据的本地预览。 */
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')

const result = await build({ entryPoints: ['scripts/settings-preview.tsx'], bundle: true, write: false, outdir: 'preview', format: 'esm', platform: 'browser', jsx: 'automatic', loader: { '.css': 'local-css', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' }, define: { 'process.env.NODE_ENV': '"development"' } })
const javascript = result.outputFiles.find(file => file.path.endsWith('.js')).contents
const css = result.outputFiles.find(file => file.path.endsWith('.css'))?.contents ?? ''
const html = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Codex UI · 设置设计预览</title><link rel="stylesheet" href="/preview.css"><body data-ds-dark-theme><div id="root"></div><script type="module" src="/preview.js"></script></body></html>'
const server = createServer((request, response) => {
  if (request.url === '/preview.js') { response.setHeader('Content-Type', 'text/javascript; charset=utf-8'); response.end(javascript) }
  else if (request.url === '/preview.css') { response.setHeader('Content-Type', 'text/css; charset=utf-8'); response.end(css) }
  else { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html) }
})
server.listen(4317, '127.0.0.1', () => { console.log('设置预览：http://127.0.0.1:4317') })
