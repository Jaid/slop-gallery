import type {Linter} from 'eslint'

import {makeEslintConfig} from 'eslint-config-jaid'
import branchComponent from 'eslint-plugin-branch-component'

const config: Array<Linter.Config> = [
  {ignores: ['private/**', 'out/**', 'dist/**', 'temp/**']},
  ...makeEslintConfig(),
  branchComponent.configs.recommended,
]

export default config
