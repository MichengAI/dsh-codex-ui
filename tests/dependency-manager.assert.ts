import assert from 'node:assert/strict'
import { applyReleaseExclude, resolveDshCliEntry } from '../src/dependency-manager.ts'

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