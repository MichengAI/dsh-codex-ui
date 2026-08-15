const packageId = '@michengai/dsh-codex-ui'
const buildMode = process.env.NODE_ENV ?? 'production'

export default [
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    dts: true,
    clean: true,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'dist',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    // React 由 DSH 的客户端模块表提供；内联会生成第二份 React 实例，导致 Hooks 失效。
    deps: { neverBundle: ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'] },
    define: {
      'process.env.NODE_ENV': JSON.stringify(buildMode),
      'import.meta.env.MODE': JSON.stringify(buildMode),
      'import.meta.env': JSON.stringify({ MODE: buildMode }),
    },
    dts: false,
    clean: false,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
]
