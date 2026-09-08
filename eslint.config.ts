import {makeEslintConfig} from 'eslint-config-jaid'

export default [
  {ignores: ['private/']},
  ...makeEslintConfig(),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'typescript/no-floating-promises': ['error', {ignoreVoid: false}],
      'typescript/no-misused-promises': 'error',
      'typescript/no-unsafe-argument': 'error',
      'typescript/no-unsafe-assignment': 'error',
      'typescript/no-unsafe-call': 'error',
      'typescript/no-unsafe-declaration-merging': 'error',
      'typescript/no-unsafe-enum-comparison': 'error',
      'typescript/no-unsafe-member-access': 'error',
      'typescript/no-unsafe-return': 'error',
      'typescript/no-unsafe-unary-minus': 'error',
    },
  },
]
