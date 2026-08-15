import assert from 'node:assert/strict'
import { skillGroupOf } from '../src/skills.ts'

assert.equal(skillGroupOf('bundled'), 'builtin')
assert.equal(skillGroupOf('user-agents'), 'installed')
assert.equal(skillGroupOf('project-dsh'), 'installed')
