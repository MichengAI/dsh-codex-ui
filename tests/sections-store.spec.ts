import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  SectionsDocumentError,
  readSectionsDocument,
  resolveSectionsStorePath,
  validateSectionsDocument,
  writeSectionsDocument,
} from '../src/sections-store.ts'

describe('分区宿主存储', () => {
  let dir = ''

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dcu-sections-'))
    process.env.DSH_PROFILE_DIR = dir
  })

  afterEach(() => {
    delete process.env.DSH_PROFILE_DIR
    rmSync(dir, { recursive: true, force: true })
  })

  it('落在 profile 的 plugin-data 下，不写浏览器可访问的位置', () => {
    const path = resolveSectionsStorePath()
    expect(path.startsWith(dir)).toBe(true)
    expect(path.endsWith(join('plugin-data', 'michengai.dsh-codex-ui', 'workspace-sections.json'))).toBe(true)
  })

  it('写入后能原样读回（区间顺序即位置）', () => {
    const document = {
      version: 1,
      sections: [
        { id: 'pinned', name: '置顶', ids: ['w1'] },
        { id: 's1', name: '客户项目', ids: ['w2', 'w3'] },
        { id: 'default', name: '项目', ids: [] },
      ],
    }
    writeSectionsDocument(undefined, document)
    expect(readSectionsDocument()).toEqual(document)
    // 落盘内容是可读 JSON，便于用户自己查看/备份。
    const raw = readFileSync(resolveSectionsStorePath(), 'utf8')
    expect(JSON.parse(raw).sections[1].ids).toEqual(['w2', 'w3'])
  })

  it('同一个工作区出现在两个分区时拒绝写入', () => {
    expect(() =>
      validateSectionsDocument({
        sections: [
          { id: 'a', name: 'A', ids: ['w1'] },
          { id: 'b', name: 'B', ids: ['w1'] },
        ],
      }),
    ).toThrow(SectionsDocumentError)
  })

  it('分区 id 重复、名称为空、成员不是字符串都拒绝', () => {
    expect(() => validateSectionsDocument({ sections: [{ id: 'a', name: 'A', ids: [] }, { id: 'a', name: 'B', ids: [] }] })).toThrow(
      SectionsDocumentError,
    )
    expect(() => validateSectionsDocument({ sections: [{ id: 'a', name: '   ', ids: [] }] })).toThrow(SectionsDocumentError)
    expect(() => validateSectionsDocument({ sections: [{ id: 'a', name: 'A', ids: [42] }] })).toThrow(SectionsDocumentError)
    expect(() => validateSectionsDocument({ sections: 'nope' })).toThrow(SectionsDocumentError)
  })

  it('文件损坏时读返回 undefined，不抛错也不删除文件', () => {
    const path = resolveSectionsStorePath()
    writeSectionsDocument(undefined, { version: 1, sections: [{ id: 'pinned', name: '置顶', ids: [] }] })
    writeFileSync(path, '{ 坏掉的 json', 'utf8')
    expect(readSectionsDocument()).toBeUndefined()
  })
})
