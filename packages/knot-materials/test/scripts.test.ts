import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import fs from 'fs-extra'

import makePrompt, {selectExamples} from '../scripts/makePrompt.ts'
import {knots} from '../src/main.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const readSource = (file: string) => fs.readFile(resolve(root, file), 'utf8')
describe('inference prompts', () => {
  test('sampling is deterministic, distinct and diverse without hardcoding example IDs', () => {
    const first = selectExamples()
    expect(first.map(entry => entry.id)).toEqual(selectExamples().map(entry => entry.id))
    expect(first).toHaveLength(3)
    const distinctExampleIds = new Set(first.map(entry => entry.id))
    expect(distinctExampleIds.size).toBe(3)
    const distinctCandidateIds = new Set(first.map(entry => entry.candidateId))
    expect(distinctCandidateIds.size).toBe(3)
    const distinctShadings = new Set(first.map(entry => entry.placeholder.shading))
    expect(distinctShadings.size).toBe(3)
    expect(selectExamples({examples: 1})).toHaveLength(1)
    expect(selectExamples({examples: knots.length})).toHaveLength(knots.length)
    expect(selectExamples({exampleIds: ['ferrothorn', 'washi_lantern']}).map(entry => entry.id)).toEqual(['ferrothorn', 'washi_lantern'])
  })
  test('includes every global library file verbatim plus self-contained material examples', async () => {
    const options = {
      candidate: 'claude_opus',
      count: 5,
      exampleIds: ['ferrothorn', 'washi_lantern', 'coralline_crown'],
    }
    const prompt = await makePrompt(options)
    expect(prompt).toBe(await makePrompt(options))
    expect(prompt).toContain('# Create 5 new knot materials')
    expect(prompt).toContain('candidate `claude_opus`')
    const libraryFileGlob = new Bun.Glob('**/*.ts')
    for (const file of await Array.fromAsync(libraryFileGlob.scan(resolve(root, 'src/lib')))) {
      expect(prompt).toContain(`### src/lib/${file.replaceAll('\\', '/')}`)
      const librarySource = await readSource(`src/lib/${file}`)
      expect(prompt).toContain(librarySource.trimEnd())
    }
    for (const id of options.exampleIds) {
      for (const file of ['data.ts', 'Material.ts']) {
        const exampleSource = await readSource(`src/entries/${id}/${file}`)
        expect(prompt).toContain(exampleSource.trimEnd())
      }
    }
    const viewerFrameSource = await readSource('src/candidates/gpt_astra/lib/viewerFrame.ts')
    expect(prompt).toContain(viewerFrameSource.trimEnd())
    const knotShellSource = await readSource('src/candidates/gpt_astra/lib/knotShell.ts')
    expect(prompt).toContain(knotShellSource.trimEnd())
    expect(prompt).toContain('exports an anonymous default class')
    expect(prompt).toContain('compact one-line JSDoc immediately above that class')
    expect(prompt).toContain('do not create knot-scoped helper or library files')
    expect(prompt).toContain('knot-only helpers stay inside the corresponding Material.ts')
    for (const entry of knots) {
      expect(prompt).toContain(entry.id)
    }
    expect(prompt).toContain('flavorText')
    expect(prompt).not.toContain('icon.jxl')
    expect(prompt).toContain('src/rarities.ts')
    expect(prompt).toContain('using `unknown` for new entries')
    expect(prompt).toContain('unknown=0 (no stars)')
    expect(prompt).not.toContain('src/lib/knots/')
  })
  test('rejects invalid sampling and generation arguments before assembling a prompt', async () => {
    for (const count of [0, -1, 1.2, Number.NaN, Infinity]) {
      await expect(makePrompt({count})).rejects.toThrow('positive integer')
    }
    for (const examples of [0, 1.2, Number.NaN, Infinity, knots.length + 1]) {
      expect(() => selectExamples({examples})).toThrow('Example count')
    }
    expect(() => selectExamples({exampleIds: []})).toThrow('unique')
    expect(() => selectExamples({exampleIds: ['ferrothorn', 'ferrothorn']})).toThrow('unique')
    expect(() => selectExamples({exampleIds: ['../outside']})).toThrow('Unknown example')
    await expect(makePrompt({candidate: 'missing'})).rejects.toThrow('Unknown Knot candidate')
  })
  test('the CLI writes Markdown from another working directory without making inference requests', async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'knot-prompt-test-'))
    try {
      const output = join(directory, 'nested', 'prompt.md')
      const process = Bun.spawn(['bun', resolve(root, 'scripts/makePrompt.ts'), '--candidate', 'hy', '--count', '2', '--example-ids', 'ferrothorn,washi_lantern', '--output', output], {
        cwd: directory,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const stderrResponse = new Response(process.stderr)
      const [exitCode, stderr] = await Promise.all([process.exited, stderrResponse.text()])
      expect(exitCode, stderr).toBe(0)
      expect(await fs.readFile(output, 'utf8')).toBe(await makePrompt({
        candidate: 'hy',
        count: 2,
        exampleIds: ['ferrothorn', 'washi_lantern'],
      }))
    } finally {
      await fs.rm(directory, {
        recursive: true,
        force: true,
      })
    }
  })
})
