import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, win32 } from 'node:path'

export const SUITE_PACKAGE = '@michengai/dsh-codex-suite'
export const BASE_BUNDLE = '@deepseek-ai/dsh-base'
export const WEB_BUNDLE = '@deepseek-ai/dsh-web-app'

const suiteManifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/** Keep the same layer order as the legacy aggregate patch. */
export const MEMBER_PACKAGES = [
  '@michengai/dsh-archive-manager',
  '@michengai/dsh-codex-ui',
  '@michengai/dsh-skills-manager',
  '@michengai/dsh-agency-agents',
  '@michengai/dsh-im-connect',
  '@michengai/dsh-automation',
]

export function memberSpecs(manifest = suiteManifest) {
  return MEMBER_PACKAGES.map((packageName) => {
    let version = manifest.dshCodexSuite?.members?.[packageName] ?? manifest.dependencies?.[packageName]
    if (version?.startsWith('workspace:') === true && packageName === '@michengai/dsh-codex-ui') {
      version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version
    }
    if (typeof version !== 'string' || version === '' || version.startsWith('workspace:')) {
      throw new Error(`Suite manifest does not contain a published version for ${packageName}.`)
    }
    return `${packageName}@${version}`
  })
}

export function parseArgs(argv) {
  const options = {
    profile: 'web',
    registry: 'https://registry.npmjs.org/',
    dryRun: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--profile') options.profile = argv[++index]
    else if (argument.startsWith('--profile=')) options.profile = argument.slice('--profile='.length)
    else if (argument === '--registry') options.registry = argv[++index]
    else if (argument.startsWith('--registry=')) options.registry = argument.slice('--registry='.length)
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (typeof options.profile !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(options.profile) || options.profile === 'node_modules') {
    throw new Error(`Invalid DSH profile name: ${JSON.stringify(options.profile)}`)
  }
  let registry
  try {
    registry = new URL(options.registry)
  } catch {
    throw new Error(`Invalid npm registry URL: ${JSON.stringify(options.registry)}`)
  }
  if (registry.protocol !== 'https:' && registry.protocol !== 'http:') throw new Error('npm registry must use HTTP or HTTPS.')
  if (registry.username !== '' || registry.password !== '' || registry.search !== '' || registry.hash !== '' || !/^[0-9A-Za-z._~/-]*$/.test(registry.pathname)) {
    throw new Error('npm registry URL contains unsupported characters.')
  }
  options.registry = registry.href
  return options
}

export function profileDirectory(profile, env = process.env, home = homedir()) {
  const dshHome = env.DSH_HOME === undefined || env.DSH_HOME === '' ? resolve(home, '.dsh') : resolve(env.DSH_HOME)
  return resolve(dshHome, 'profiles', profile)
}

export function normalizeBundles(bundles = []) {
  const managed = new Set([BASE_BUNDLE, WEB_BUNDLE, SUITE_PACKAGE, ...MEMBER_PACKAGES])
  const unrelated = bundles.filter((name, index) => typeof name === 'string' && !managed.has(name) && bundles.indexOf(name) === index)
  return [BASE_BUNDLE, WEB_BUNDLE, ...unrelated, ...MEMBER_PACKAGES]
}

export function allowRequiredBuilds(source) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex(line => line === 'allowBuilds:')
  if (start === -1) return `${source}${source === '' || source.endsWith('\n') ? '' : eol}allowBuilds:${eol}  protobufjs: false${eol}  koffi: false${eol}`
  let end = start + 1
  while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end += 1
  const body = lines.slice(start + 1, end).filter(line => !/^\s{2}(?:protobufjs|koffi):/.test(line))
  lines.splice(start + 1, end - start - 1, '  protobufjs: false', '  koffi: false', ...body)
  return lines.join(eol)
}

export function directInstallArgs(profile, registry, manifest = suiteManifest) {
  return ['plugin', '--profile', profile, 'add', ...memberSpecs(manifest), '--save-exact', `--registry=${registry}`]
}

export function helpText() {
  return `Usage: dsh-codex-suite-installer [options]\n\nInstall every Codex Suite member as a direct dependency of one DSH profile.\n\nOptions:\n  --profile <name>    target profile (default: web)\n  --registry <url>    npm registry (default: https://registry.npmjs.org/)\n  --dry-run           print commands without changing the profile\n  -h, --help          show this help\n`
}

function quote(argument) {
  return /[\s"']/u.test(argument) ? JSON.stringify(argument) : argument
}

export function validateWindowsDshCommand(command) {
  if (typeof command !== 'string' || command === '' || command.trim() !== command || /["&|<>^%\r\n]/u.test(command)) {
    throw new Error('DSH_BIN contains unsupported shell characters.')
  }
  if (/^[0-9A-Za-z._-]+$/u.test(command)) return command
  if (/^[A-Za-z]:\\/u.test(command) && win32.isAbsolute(command)) return command
  throw new Error('DSH_BIN must be a command name or an absolute local Windows path.')
}

function quoteWindowsCommandArgument(argument) {
  if (/["\r\n]/u.test(argument)) throw new Error('dsh argument contains unsupported shell characters.')
  return `"${argument}"`
}

function runDsh(args, { dryRun = false, command = process.env.DSH_BIN || 'dsh' } = {}) {
  process.stdout.write(`> dsh ${args.map(quote).join(' ')}\n`)
  if (dryRun) return
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `call ${quoteWindowsCommandArgument(validateWindowsDshCommand(command))} ${args.map(quoteWindowsCommandArgument).join(' ')}`], { encoding: 'utf8', stdio: 'inherit', windowsHide: true })
    : spawnSync(command, args, { encoding: 'utf8', stdio: 'inherit' })
  if (result.error !== undefined) throw new Error(`Unable to run dsh: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`dsh exited with code ${result.status ?? 1}.`)
}

function readProfileManifest(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function suiteDeclared(manifest) {
  return manifest.dependencies?.[SUITE_PACKAGE] !== undefined
    || manifest.devDependencies?.[SUITE_PACKAGE] !== undefined
    || manifest.dsh?.profile?.bundles?.includes(SUITE_PACKAGE) === true
}

function legacyDirectPackages(manifest) {
  const declared = { ...manifest.devDependencies, ...manifest.dependencies }
  return [
    ...(suiteDeclared(manifest) ? [SUITE_PACKAGE] : []),
    ...(declared[WEB_BUNDLE] !== undefined ? [WEB_BUNDLE] : []),
  ]
}

function writeNormalizedManifest(path) {
  const manifest = readProfileManifest(path)
  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  manifest.dsh.profile.bundles = normalizeBundles(manifest.dsh.profile.bundles)
  writeFileSync(path, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
}

export function installSuite(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    process.stdout.write(helpText())
    return
  }
  const profilePath = profileDirectory(options.profile)
  const manifestPath = resolve(profilePath, 'package.json')
  const workspacePath = resolve(profilePath, 'pnpm-workspace.yaml')
  if (!existsSync(manifestPath)) runDsh(['plugin', '--profile', options.profile, 'install', '--lockfile-only', '--ignore-scripts'], options)
  if (options.dryRun) {
    process.stdout.write(`> ensure protobufjs build scripts stay explicitly disabled in ${workspacePath}\n`)
  } else {
    const workspace = existsSync(workspacePath) ? readFileSync(workspacePath, 'utf8') : ''
    const nextWorkspace = allowRequiredBuilds(workspace)
    if (nextWorkspace !== workspace) writeFileSync(workspacePath, nextWorkspace, 'utf8')
  }
  runDsh(directInstallArgs(options.profile, options.registry), options)
  if (options.dryRun) {
    process.stdout.write(`> ensure ${WEB_BUNDLE} precedes the six member bundles in ${manifestPath}\n`)
    process.stdout.write(`> remove legacy ${SUITE_PACKAGE} and redundant direct ${WEB_BUNDLE} dependencies when present\n`)
    return
  }
  const installedManifest = readProfileManifest(manifestPath)
  const legacyPackages = legacyDirectPackages(installedManifest)
  if (legacyPackages.length > 0) runDsh(['plugin', '--profile', options.profile, 'remove', ...legacyPackages], options)
  writeNormalizedManifest(manifestPath)
  runDsh(['--profile', options.profile, '--dump-config'], options)
  process.stdout.write(`\nCodex Suite members are direct plugins in profile ${options.profile}. Restart DSH and hard-refresh the browser.\n`)
}
