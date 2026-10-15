import type {Linter} from 'eslint'

import {makeEslintConfig} from 'eslint-config-jaid'
import branchComponent from 'eslint-plugin-branch-component'

const config: Array<Linter.Config> = [
  {ignores: ['private/**', 'out/**', 'dist/**', 'temp/**']},
  ...makeEslintConfig(),
  branchComponent.configs.recommended,
  {
    // Workspace packages resolve their peers from the root install.
    files: ['packages/**/package.json'],
    rules: {'package-json/specify-peers-locally': 'off'},
  },
]

export default config
