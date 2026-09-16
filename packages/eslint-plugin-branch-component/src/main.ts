import type {ESLint, Linter} from 'eslint'

import packageJson from '../package.json' with {type: 'json'}
import expandChildren from './rules/expand-children.ts'
import preferBranchComponent from './rules/prefer-branch-component.ts'
import preferPositive from './rules/prefer-positive.ts'
import simplifyChildren from './rules/simplify-children.ts'
import simplifyClassName from './rules/simplify-classname.ts'

export const rules = {
  'expand-children': expandChildren,
  'prefer-branch-component': preferBranchComponent,
  'prefer-positive': preferPositive,
  'simplify-children': simplifyChildren,
  'simplify-classname': simplifyClassName,
}

const plugin = {
  meta: {
    name: packageJson.name,
    version: packageJson.version,
    namespace: 'branch-component',
  },
  // ESLint 10 exposes language-neutral rule types; typescript-eslint retains
  // compatibility members in its context type. Adapt only at this boundary.
  rules: rules as unknown as Record<keyof typeof rules, NonNullable<ESLint.Plugin['rules']>[string]>,
  configs: {} as Record<'recommended', Linter.Config>,
} satisfies ESLint.Plugin
plugin.configs.recommended = {
  name: 'branch-component/recommended',
  files: ['**/*.{jsx,tsx}'],
  languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
  plugins: {'branch-component': plugin},
  rules: {
    'branch-component/prefer-branch-component': 'error',
    'branch-component/prefer-positive': 'error',
    'branch-component/simplify-children': 'error',
    'branch-component/simplify-classname': 'error',
    'branch-component/expand-children': 'error',
  },
}

export default plugin
