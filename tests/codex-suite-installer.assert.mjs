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
  validateWindowsDshCommand,
} from '../packages/dsh-codex-suite-installer/installer.mjs'

const installerManifest = JSON.parse(readFileSync(new URL('../packages/dsh-codex-suite-installer/package.json', import.meta.url), 'utf8'))
const rootManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(installerManifest.name, '@michengai/dsh-codex-suite-installer')
assert.equal(installerManifest.version, '0.1.6')
assert.equal(installerManifest.bin?.['dsh-codex-suite-installer'], './bin.mjs')
assert.equal(installerManifest.dependencies, undefined, '轻量 npx 安装器不能安装六个成员的传递依赖树')
assert.deepEqual(Object.keys(installerManifest.dshCodexSuite?.members ?? {}), MEMBER_PACKAGES)
assert.equal(rootManifest.version, '0.2.89', '根包必须使用本次发布版本')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-codex-ui'], rootManifest.version, '安装器必须锁定与根包相同的 UI 版本')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-archive-manager'], '0.1.16', '安装器必须锁定已验证的归档管理器版本')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-skills-manager'], '0.1.25', '安装器必须锁定已验证的技能管理器版本')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-im-connect'], '0.1.24', '安装器必须锁定本次发布的 IM 版本')
assert.equal(installerManifest.dshCodexSuite.members['@michengai/dsh-automation'], '0.1.21', '安装器必须锁定支持任务设置桥接的定时任务版本')

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
  [BASE_BUNDLE, WEB_BUNDLE, 'third-party-before', 'third-party-after', ...MEMBER_PACKAGES],
  '迁移必须移除旧 Suite、去重、保留无关插件，并让六个成员成为独立 bundle',
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
