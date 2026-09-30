import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import fs from 'fs-extra'

import PromptSources from '../scripts/lib/PromptSources.ts'
import makePrompt from '../scripts/makePrompt.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('authoring context', () => {
  test('includes the complete selected candidate API even when none of the examples use it', async () => {
    const prompt = await makePrompt({
      candidate: 'gpt_astra',
      exampleIds: ['opal_fire'],
    })
    for (const file of await fs.readdir(resolve(root, 'src/candidates/gpt_astra/lib'))) {
      if (!file.endsWith('.ts')) {
        continue
      }
      const source = await fs.readFile(resolve(root, 'src/candidates/gpt_astra/lib', file), 'utf8')
      expect(prompt).toContain(source.trimEnd())
    }
    expect(prompt).toContain('- `../../candidates/gpt_astra/lib/premiumIntimate.ts`')
    expect(prompt).not.toContain('### src/StudioEnvironment.ts')
    expect(prompt).not.toContain('### scripts/lib/')
    expect(prompt).not.toContain('### src/candidates/grok/lib/')
  })
  test('follows imports, type declarations, reexports and cycles, but not arbitrary directory contents or comment text', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'prompt-graph-'))
    try {
      await fs.outputFile(join(dir, 'lib/index.ts'), "export * from './used.ts'\nexport type * from './types.ts'\n")
      await fs.outputFile(join(dir, 'lib/used.ts'), "import {value} from './dependency.ts'\n// import './imaginary.ts'\nexport const used = value\n")
      await fs.outputFile(join(dir, 'lib/dependency.ts'), "import type {Value} from './types.ts'\nexport const value: Value = 1\n")
      await fs.outputFile(join(dir, 'lib/types.ts'), "export type * from './index.ts'\nexport type Value = number\n")
      await fs.outputFile(join(dir, 'lib/unrelated.ts'), 'throw new Error("Do not evaluate or include me")\n')
      const context = new PromptSources(dir)
      await context.add('lib/index.ts')
      expect([...context.files.keys()].toSorted()).toEqual(['lib/dependency.ts', 'lib/index.ts', 'lib/types.ts', 'lib/used.ts'])
      expect(context.markdown()).not.toContain('Do not evaluate')
      expect(context.markdown().match(/### lib\/types.ts/g)).toHaveLength(1)
    } finally {
      await fs.remove(dir)
    }
  })
})
