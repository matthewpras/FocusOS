import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hookFiles = [
  'hooks/useAssistant.ts',
  'hooks/useCaptures.ts',
  'hooks/useExternalCommitments.ts',
  'hooks/useHabits.ts',
  'hooks/useTasks.ts',
]

test('realtime hooks use unique channel topics per mount', () => {
  for (const hookFile of hookFiles) {
    const source = readFileSync(hookFile, 'utf8')

    assert.match(source, /\.channel\(`[^`]+\$\{userId\}-\$\{crypto\.randomUUID\(\)\}`\)/)
  }
})
