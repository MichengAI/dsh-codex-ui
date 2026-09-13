/** 安装器发布的双语事实源；生成同一成员清单并更新独立版本章节。 */
export function installerReleaseBodies(members) {
  const list = Object.entries(members).map(([name, version]) => `- \`${name}@${version}\``).join('\n')
  return {
    chinese: `一键维护安装 ${Object.keys(members).length} 个自研插件。包含以下插件及版本：\n\n${list}\n\n安装器使用这些精确版本执行安装，确保可复现。`,
    english: `Install or maintain ${Object.keys(members).length} first-party plugins in one step. Included plugins and versions:\n\n${list}\n\nThe installer uses these exact versions for reproducible installation.`,
  }
}

export function upsertChangelog(source, version, body, date) {
  const headings = [...source.matchAll(/^## ([^\r\n]+)\r?$/gm)]
  const existing = headings.findIndex(match => match[1].split(' ')[0] === version)
  const section = `## ${version} - ${date}\n\n${body.trim()}\n\n`
  if (existing >= 0) {
    const start = headings[existing].index
    const end = headings[existing + 1]?.index ?? source.length
    return source.slice(0, start) + section + source.slice(end)
  }
  const firstRelease = headings.find(match => !['Unreleased', '未发布'].includes(match[1]))
  const at = firstRelease?.index ?? source.length
  return source.slice(0, at).trimEnd() + '\n\n' + section + source.slice(at)
}

export function bilingualReleaseNotes(chinese, english) {
  if (!chinese?.trim() || !english?.trim()) throw new Error('Release notes require both Chinese and English changelog sections.')
  return `## 中文说明\n\n${chinese.trim()}\n\n---\n\n## English\n\n${english.trim()}\n`
}
