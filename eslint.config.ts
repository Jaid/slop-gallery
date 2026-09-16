import type {Linter} from 'eslint'

import {makeEslintConfig} from 'eslint-config-jaid'

const config: Array<Linter.Config> = [
  {ignores: ['private/**', 'out/**', 'dist/**', 'temp/**']},
  ...makeEslintConfig({excludeRules: ['stylistic/type-generic-spacing']}),
]

export default config
