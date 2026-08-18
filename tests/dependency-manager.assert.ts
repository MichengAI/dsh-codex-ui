import assert from 'node:assert/strict'
import { applyReleaseExclude, resolveDshCliEntry } from '../src/dependency-manager.ts'
import { crossSiteRequest } from '../src/index.ts'

assert.equal(
  resolveDshCliEntry('apps/cli/src/bin.ts', 'D:\\Repository\\deepseek-harness'),
  'D:\\Repository\\deepseek-harness\\apps\\cli\\src\\bin.ts',
  '源码启动的相对 CLI 入口必须按当前工作目录收成绝对路径',
)
assert.equal(
  resolveDshCliEntry('D:\\Tools\\nodejs\\node_modules\\dsh\\bin.js', 'C:\\Users\\demo'),
  'D:\\Tools\\nodejs\\node_modules\\dsh\\bin.js',
  '已经是绝对路径的已安装 CLI 不得再拼接他人目录',
)
assert.equal(
  resolveDshCliEntry('file:///D:/Repository/deepseek-harness/apps/cli/src/bin.ts', 'C:\\elsewhere'),
  'D:\\Repository\\deepseek-harness\\apps\\cli\\src\\bin.ts',
  'file URL 入口必须转成当前机器的文件系统路径',
)

const source = [
  'packages:',
  '  - .',
  '',
  'minimumReleaseAgeExclude:',
  "  - '@michengai/dsh-skills-manager@0.1.8'",
  "  - '@michengai/dsh-archive-manager@0.1.2'",
  '',
].join('\n')

assert.match(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.9'),
  /@michengai\/dsh-skills-manager@0\.1\.8 \|\| 0\.1\.9/,
  '同一包的新确认版本必须合并进已有白名单行',
)
assert.equal(
  applyReleaseExclude(source, '@michengai/dsh-skills-manager', '0.1.8'),
  source,
  '重复确认同一版本时不得改写白名单',
)
assert.match(
  applyReleaseExclude('packages:\n  - .\n', '@michengai/dsh-archive-manager', '0.1.3'),
  /minimumReleaseAgeExclude:\n  - '@michengai\/dsh-archive-manager@0\.1\.3'\n/,
  '没有白名单段时必须新建精确版本例外',
)
assert.throws(
  () => applyReleaseExclude(source, '@michengai/dsh-skills-manager', "0.1.9'evil"),
  /无法识别/,
  '带单引号的版本不得写入 YAML 白名单',
)
assert.match(
  applyReleaseExclude(source, '@michengai/dsh-codex-ui', '0.2.53-rc.1'),
  /@michengai\/dsh-codex-ui@0\.2\.53-rc\.1/,
  '预发布版本仍可写入白名单',
)

// 依赖安装 POST 端点的跨站请求判定：浏览器恶意网页可用表单跨站触发安装，
// 必须按 Sec-Fetch-Site / Origin 与 Host 的比对阻断。
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x?dependency=ui' }),
  false,
  '无 headers 的非浏览器请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-origin' } }),
  false,
  '同源 fetch 必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'none' } }),
  false,
  '地址栏直达等非页面发起的请求必须放行',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'cross-site' } }),
  true,
  '跨站请求必须拦截',
)
assert.equal(
  crossSiteRequest({ method: 'POST', url: '/api/x', headers: { 'sec-fetch-site': 'same-site' } }),
  true,
  '同站不同源端口也必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'http://localhost:3080', host: 'localhost:3080' },
  }),
  false,
  '老浏览器同源 POST（Origin 与 Host 一致）必须放行',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'https://evil.example', host: 'localhost:3080' },
  }),
  true,
  'Origin 与 Host 不一致的请求必须拦截',
)
assert.equal(
  crossSiteRequest({
    method: 'POST',
    url: '/api/x?dependency=ui',
    headers: { origin: 'null', host: 'localhost:3080' },
  }),
  true,
  'Origin 为 null 的沙盒页面请求必须拦截',
)