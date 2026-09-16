import {afterAll, describe, test} from 'bun:test'

import {RuleTester} from '@typescript-eslint/rule-tester'

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = test
RuleTester.itOnly = test.only

export const ruleTester = new RuleTester({
  languageOptions: {
    sourceType: 'module',
    parserOptions: {ecmaFeatures: {jsx: true}},
  },
})

export const branchImport = "import Branch from 'branch-component';\n"
