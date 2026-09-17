import {describe, expect, test} from 'bun:test'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import makeIcon from '../scripts/makeIcon.ts'
import makePrompt, {selectExamples} from '../scripts/makePrompt.ts'
import updateIcons from '../scripts/updateIcons.ts'
import {knots} from '../src/main.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const readSource = (file: string) => readFile(resolve(root, file), 'utf8')
describe('inference prompts', () => {
  test('sampling is deterministic, distinct and diverse without hardcoding example IDs', () => {
    const first = selectExamples()
    expect(first.map(entry => entry.id)).toEqual(selectExamples().map(entry => entry.id))
    expect(first).toHaveLength(3)
    expect(new Set(first.map(entry => entry.id)).size).toBe(3)
    expect(new Set(first.map(entry => entry.candidateId)).size).toBe(3)
    expect(new Set(first.map(entry => entry.placeholder.shading)).size).toBe(3)
    expect(first.every(entry => !entry.archived)).toBe(true)
    expect(selectExamples({examples: 1})).toHaveLength(1)
    expect(selectExamples({examples: knots.length})).toHaveLength(knots.length)
    expect(selectExamples({exampleIds: ['ferrothorn', 'washi_lantern']}).map(entry => entry.id)).toEqual(['ferrothorn', 'washi_lantern'])
  })
  test('includes every global library file verbatim, real materials, metadata and transitive private helpers', async () => {
    const options = {
      candidate: 'claude_opus',
      count: 5,
      exampleIds: ['ferrothorn', 'washi_lantern', 'coralline_crown'],
    }
    const prompt = await makePrompt(options)
    expect(prompt).toBe(await makePrompt(options))
    expect(prompt).toContain('# Create 5 new knot materials')
    expect(prompt).toContain('candidate `claude_opus`')
    for (const file of await Array.fromAsync(new Bun.Glob('**/*.ts').scan(resolve(root, 'src/lib')))) {
      expect(prompt).toContain(`### src/lib/${file.replaceAll('\\', '/')}`)
      expect(prompt).toContain((await readSource(`src/lib/${file}`)).trimEnd())
    }
    for (const id of options.exampleIds) {
      for (const file of ['data.ts', 'Material.ts', 'util.ts']) {
        expect(prompt).toContain((await readSource(`src/entries/${id}/${file}`)).trimEnd())
      }
    }
    expect(prompt).toContain((await readSource('src/candidates/gpt_astra/lib/viewerFrame.ts')).trimEnd())
    expect(prompt).toContain((await readSource('src/candidates/gpt_astra/lib/knotShell.ts')).trimEnd())
    for (const entry of knots) {
      expect(prompt).toContain(entry.id)
    }
    expect(prompt).toContain('flavorText')
    expect(prompt).toContain('src/rarities.ts')
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
    const directory = await mkdtemp(join(tmpdir(), 'knot-prompt-test-'))
    try {
      const output = join(directory, 'nested', 'prompt.md')
      const process = Bun.spawn(['bun', resolve(root, 'scripts/makePrompt.ts'), '--candidate', 'hy', '--count', '2', '--example-ids', 'ferrothorn,washi_lantern', '--output', output], {
        cwd: directory,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()])
      expect(exitCode, stderr).toBe(0)
      expect(await readFile(output, 'utf8')).toBe(await makePrompt({
        candidate: 'hy',
        count: 2,
        exampleIds: ['ferrothorn', 'washi_lantern'],
      }))
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      })
    }
  })
})
describe('icon generation entry points', () => {
  test('invalid identities and formats fail before any browser connection or project writes', async () => {
    await expect(makeIcon({
      id: '../outside',
      browserURL: 'invalid',
    })).rejects.toThrow('Unknown Knot ID')
    await expect(makeIcon({
      id: 'ferrothorn',
      output: 'wrong.png',
      browserURL: 'invalid',
    })).rejects.toThrow('.jxl')
    await expect(updateIcons({
      candidates: ['../outside'],
      browserURL: 'invalid',
    })).rejects.toThrow('Unknown Knot candidate')
  })
  test('both icon CLIs expose help without requiring a running browser', async () => {
    for (const name of ['makeIcon', 'updateIcons']) {
      const process = Bun.spawn(['bun', resolve(root, `scripts/${name}.ts`), '--help'], {
        cwd: tmpdir(),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [exitCode, stdout, stderr] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()])
      expect(exitCode, stderr).toBe(0)
      expect(stdout).toContain('Usage:')
    }
  })
})
