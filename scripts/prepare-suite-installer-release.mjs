import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MEMBER_PACKAGES } from '../packages/dsh-codex-suite-installer/installer.mjs'

const installerPath = new URL('../packages/dsh-codex-suite-installer/package.json', import.meta.url)
const compatibilitySuitePath = new URL('../packages/dsh-codex-suite/package.json', import.meta.url)
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const UI_PACKAGE = '@michengai/dsh-codex-ui'

function parseArgs(argv) {
  const options = { version: undefined, dryRun: false, releaseNotes: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--version') options.version = argv[++index]
    else if (argument.startsWith('--version=')) options.version = argument.slice('--version='.length)
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--release-notes') options.releaseNotes = argv[++index]
    else if (argument.startsWith('--release-notes=')) options.releaseNotes = argument.slice('--release-notes='.length)
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (options.version !== undefined && !SEMVER.test(options.version)) {
    throw new Error(`Invalid installer version: ${JSON.stringify(options.version)}`)
  }
  if (options.releaseNotes !== undefined && options.releaseNotes === '') throw new Error('Release notes path cannot be empty.')
  return options
}

function compareVersions(left, right) {
  const parse = (value) => value.split(/[+-]/, 1)[0].split('.').map(Number)
  const [leftMajor, leftMinor, leftPatch] = parse(left)
  const [rightMajor, rightMinor, rightPatch] = parse(right)
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch
}

function nextPatch(version) {
  const [major, minor, patch] = version.split(/[+-]/, 1)[0].split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

async function resolveLatest(packageName) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`)
  if (!response.ok) throw new Error(`Unable to read npm metadata for ${packageName}: ${response.status} ${response.statusText}`)
  const metadata = await response.json()
  const version = metadata?.['dist-tags']?.latest
  if (typeof version !== 'string' || !SEMVER.test(version)) {
    throw new Error(`npm latest is not a published semver version for ${packageName}.`)
  }
  return version
}

function renderReleaseNotes(version, members) {
  const lines = [
    `# DSH Codex Suite Installer v${version}`,
    '',
    'Resolved the following exact member versions from the official npm registry at release time:',
    '',
    ...MEMBER_PACKAGES.map((packageName) => `- \`${packageName}@${members[packageName]}\``),
    '',
    'The installer records these exact versions and installs them with `--save-exact`, so end-user installs remain reproducible.',
    '',
  ]
  return lines.join('\n')
}

const options = parseArgs(process.argv.slice(2))
const manifest = JSON.parse(readFileSync(installerPath, 'utf8'))
const compatibilitySuite = JSON.parse(readFileSync(compatibilitySuitePath, 'utf8'))
const currentVersion = manifest.version
if (typeof currentVersion !== 'string' || !SEMVER.test(currentVersion)) throw new Error('Installer manifest has no valid version.')
if (typeof compatibilitySuite.dependencies !== 'object' || compatibilitySuite.dependencies === null) {
  throw new Error('Compatibility suite manifest has no dependency map.')
}

const version = options.version ?? nextPatch(currentVersion)
if (compareVersions(version, currentVersion) < 0) throw new Error(`Installer version ${version} cannot be lower than current ${currentVersion}.`)

const members = Object.fromEntries(await Promise.all(MEMBER_PACKAGES.map(async (packageName) => [packageName, await resolveLatest(packageName)])))
manifest.version = version
manifest.dshCodexSuite = { ...manifest.dshCodexSuite, members }
for (const packageName of MEMBER_PACKAGES) {
  if (packageName === UI_PACKAGE) continue
  if (!(packageName in compatibilitySuite.dependencies)) {
    throw new Error(`Compatibility suite is missing ${packageName}.`)
  }
  compatibilitySuite.dependencies[packageName] = members[packageName]
}

const releaseNotes = renderReleaseNotes(version, members)
if (options.releaseNotes !== undefined) writeFileSync(resolve(options.releaseNotes), releaseNotes, 'utf8')
if (!options.dryRun) {
  writeFileSync(installerPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  writeFileSync(compatibilitySuitePath, `${JSON.stringify(compatibilitySuite, null, 2)}\n`, 'utf8')
}

console.log(`${options.dryRun ? 'Prepared' : 'Updated'} @michengai/dsh-codex-suite-installer@${version}`)
for (const packageName of MEMBER_PACKAGES) console.log(`- ${packageName}@${members[packageName]}`)
