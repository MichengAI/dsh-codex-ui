#!/usr/bin/env node

import { installSuite } from './installer.mjs'

try {
  installSuite()
} catch (error) {
  process.stderr.write(`dsh-codex-suite: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
