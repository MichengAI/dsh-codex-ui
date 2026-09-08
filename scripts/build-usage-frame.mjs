/** 单独打包 iframe 的 React 环境，不与主客户端共享模块实例。 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
await build({ entryPoints: ['src/usage-frame/index.tsx'], bundle: true, outdir: 'lib', entryNames: 'usage-frame', format: 'iife', platform: 'browser', jsx: 'automatic', minify: true, loader: { '.css': 'local-css', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' } })
