import type {ESLint as ESLintTypes} from 'eslint'

import {relative} from 'node:path'

import {ESLint} from 'eslint'

export type WarningCounts = Record<string, Record<string, number>>

export function countWarnings(results: Array<ESLintTypes.LintResult>, cwd: string): WarningCounts {
  const counts: WarningCounts = {}
  for (const result of results) {
    const file = relative(cwd, result.filePath).replaceAll('\\', '/')
    for (const message of result.messages) {
      if (message.severity !== 1) {
        continue
      }
      counts[file] ??= {}
      const rules = counts[file]
      const rule = message.ruleId ?? 'unknown'
      rules[rule] = (rules[rule] ?? 0) + 1
    }
  }
  return counts
}

export function warningRegressions(current: WarningCounts, baseline: WarningCounts) {
  const regressions: Array<string> = []
  for (const [file, rules] of Object.entries(current)) {
    for (const [rule, count] of Object.entries(rules)) {
      const allowed = baseline[file]?.[rule] ?? 0
      if (count > allowed) {
        regressions.push(`${file}: ${rule} has ${count} warnings; baseline allows ${allowed}.`)
      }
    }
  }
  return regressions
}

if (import.meta.main) {
  const eslint = new ESLint
  const results = await eslint.lintFiles('.')
  const current = countWarnings(results, process.cwd())
  const baseline = await Bun.file(new URL('../eslint-baseline.json', import.meta.url)).json() as WarningCounts
  const regressions = warningRegressions(current, baseline)
  const errors = results.reduce((sum, result) => sum + result.errorCount, 0)
  if (errors || regressions.length) {
    const formatter = await eslint.loadFormatter('stylish')
    console.error(formatter.format(results))
    console.error(regressions.join('\n'))
    process.exitCode = 1
  } else {
    const warnings = results.reduce((sum, result) => sum + result.warningCount, 0)
    console.log(`ESLint: no errors or warning regressions; ${warnings} existing warnings remain in eslint-baseline.json.`)
    // This command can only ratchet the baseline downward, never authorize new warnings.
    if (Bun.argv.includes('--tighten')) {
      await Bun.write(new URL('../eslint-baseline.json', import.meta.url), `${JSON.stringify(current, null, 2)}\n`)
    }
  }
}
