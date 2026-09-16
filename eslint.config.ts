import type {Linter} from 'eslint'

import {makeEslintConfig} from 'eslint-config-jaid'

const config: Array<Linter.Config> = [
  {ignores: ['private/**', 'out/**', 'dist/**', 'temp/**']},
  ...makeEslintConfig(),
]

export default config
