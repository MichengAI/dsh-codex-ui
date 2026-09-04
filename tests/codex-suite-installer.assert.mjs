import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BASE_BUNDLE,
  MEMBER_PACKAGES,
  SUITE_PACKAGE,
  WEB_BUNDLE,
  allowRequiredBuilds,
  directInstallArgs,
  helpText,
  memberSpecs,
  normalizeBundles,
  parseArgs,
  profileDirectory,
  quoteWindowsCommandArgument,
  validateWindowsDshCommand,
} from '../packages/dsh-codex-suite-installer/installer.mjs'

const installerManifest = JSON.parse(readFileSync(new URL('../packages/dsh-codex-suite-installer/package.json', import.meta.url), 'utf8'))
const rootManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(installerManifest.name, '@michengai/dsh-codex-suite-installer')
assert.match(installerManifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, '安装器版本必须是发布版 semver')
assert.equal(installerManifest.bin?.['dsh-codex-suite-installer'], 'bin.mjs', '安装器清单必须使用 npm 发布后保留的规范 bin 路径')
assert.equal(installerManifest.dependencies, undefined, '轻量 npx 安装器不能安装六个成员的传递依赖树')
assert.deepEqual(Object.keys(installerManifest.dshCodexSuite?.members ?? {}), MEMBER_PACKAGES)
assert.match(rootManifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, '根包必须使用发布版 semver')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-codex-ui'], rootManifest.version, '安装器必须锁定与根包相同的 UI 版本')
for (const packageName of MEMBER_PACKAGES) {
  assert.match(installerManifest.dshCodexSuite.members[packageName], /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, `安装器必须锁定 ${packageName} 的精确发布版 semver`)
}

const manifest = {
  dshCodexSuite: {
    members: Object.fromEntries(MEMBER_PACKAGES.map((packageName, index) => [packageName, `0.1.${index + 1}`])),
  },
}

assert.deepEqual(
  memberSpecs(manifest),
  MEMBER_PACKAGES.map((packageName, index) => `${packageName}@0.1.${index + 1}`),
  '安装器必须使用 Suite 清单中的精确成员版本',
)
assert.equal(
  allowRequiredBuilds('packages:\n  - .\n'),
  'packages:\n  - .\nallowBuilds:\n  protobufjs: false\n  koffi: false\n',
  '新 profile 必须显式忽略 protobufjs 构建脚本，避免 pnpm 中止首次安装',
)
assert.equal(
  allowRequiredBuilds('allowBuilds:\n  esbuild: true\n'),
  'allowBuilds:\n  protobufjs: false\n  koffi: false\n  esbuild: true\n',
  '已有 allowBuilds 段必须保留并补入 protobufjs',
)
assert.equal(
  allowRequiredBuilds('allowBuilds:\n  protobufjs: set this to true or false\n  koffi: set this to true or false\n  protobufjs: false\n'),
  'allowBuilds:\n  protobufjs: false\n  koffi: false\n',
  '安装器必须修复 pnpm 失败后留下的重复构建占位项',
)
assert.equal(
  allowRequiredBuilds('allowBuilds:\n    protobufjs: true\n    koffi: true\n    esbuild: true\n'),
  'allowBuilds:\n    protobufjs: false\n    koffi: false\n    esbuild: true\n',
  '安装器必须沿用现有 YAML 缩进并移除不同缩进下的重复键',
)
assert.deepEqual(
  normalizeBundles([
    BASE_BUNDLE,
    'third-party-before',
    SUITE_PACKAGE,
    '@michengai/dsh-codex-ui',
    'third-party-after',
    WEB_BUNDLE,
    'third-party-before',
  ]),
  [BASE_BUNDLE, 'third-party-before', 'third-party-after', WEB_BUNDLE, ...MEMBER_PACKAGES],
  '旧 Suite 位于 web 前时，只能把六成员移动到 web 后，不得重排无关 bundle',
)
assert.deepEqual(
  normalizeBundles([
    BASE_BUNDLE,
    'before-web',
    WEB_BUNDLE,
    'before-suite',
    SUITE_PACKAGE,
    'after-suite',
    '@michengai/dsh-codex-ui',
    'tail',
  ]),
  [BASE_BUNDLE, 'before-web', WEB_BUNDLE, 'before-suite', ...MEMBER_PACKAGES, 'after-suite', 'tail'],
  '迁移必须在旧 Suite 原位展开六成员，并保留所有无关 bundle 的相对加载位置',
)
assert.deepEqual(
  normalizeBundles([BASE_BUNDLE, 'before-web', WEB_BUNDLE, 'tail']),
  [BASE_BUNDLE, 'before-web', WEB_BUNDLE, 'tail', ...MEMBER_PACKAGES],
  '没有旧 Suite 锚点时必须在末尾追加成员，不得移动现有 bundle',
)
assert.throws(
  () => normalizeBundles([WEB_BUNDLE, 'third-party']),
  /dsh-base/,
  '缺少 base 的 profile 必须失败，不得静默注入基础 bundle',
)
assert.throws(
  () => normalizeBundles([BASE_BUNDLE, 'third-party']),
  /dsh-web-app/,
  '缺少 web 的 profile 必须失败，不得静默注入 Web bundle',
)
assert.throws(
  () => normalizeBundles([WEB_BUNDLE, 'third-party', BASE_BUNDLE]),
  /加载顺序/,
  'base 位于 web 后时必须失败，不得擅自重排 profile 基线',
)
assert.deepEqual(
  parseArgs(['--profile', 'codex', '--registry=https://registry.npmjs.org', '--dry-run']),
  { profile: 'codex', registry: 'https://registry.npmjs.org/', dryRun: true, help: false },
)
assert.throws(() => parseArgs(['--profile', '../web']), /Invalid DSH profile name/)
assert.throws(() => parseArgs(['--registry', 'file:///tmp/registry']), /HTTP or HTTPS/)
assert.equal(validateWindowsDshCommand('dsh'), 'dsh')
assert.equal(validateWindowsDshCommand('C:\\Program Files\\nodejs\\dsh.cmd'), 'C:\\Program Files\\nodejs\\dsh.cmd')
assert.throws(() => validateWindowsDshCommand('dsh & calc.exe'), /unsupported shell characters/)
assert.throws(() => validateWindowsDshCommand('\\\\server\\share\\dsh.cmd'), /absolute local Windows path/)
assert.equal(quoteWindowsCommandArgument('safe-value'), '"safe-value"')
for (const argument of ['%TEMP%', '^value', '!value!']) {
  assert.throws(() => quoteWindowsCommandArgument(argument), /unsupported shell characters/, `Windows cmd 参数必须拒绝 ${argument}`)
}
assert.match(helpText(), /^Usage: dsh-codex-suite-installer \[options\]/, '帮助文案必须使用实际发布的 bin 名称')
assert.equal(
  profileDirectory('codex', { DSH_HOME: '/srv/dsh-home' }, '/home/demo'),
  resolve('/srv/dsh-home', 'profiles', 'codex'),
  '安装器必须复用同一个 DSH_HOME 下的目标 profile',
)
assert.deepEqual(
  directInstallArgs('codex', 'https://registry.npmjs.org/', manifest),
  ['plugin', '--profile', 'codex', 'add', ...memberSpecs(manifest), '--save-exact', '--registry=https://registry.npmjs.org/'],
  '一键入口必须把六个成员作为同一次 dsh plugin add 的直接参数',
)
