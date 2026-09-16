import rule from '../src/rules/prefer-positive.ts'
import {branchImport, ruleTester} from './ruleTester.ts'

ruleTester.run('prefer-positive', rule, {
  valid: [
    `${branchImport}<Branch if={value} then={Component} />`,
    `${branchImport}<Branch not={value} then={Component} />`,
    `${branchImport}<Branch if={!!value} then={Component} />`,
    `${branchImport}<Branch if={!value} not={other} then={Component} />`,
    `${branchImport}<Branch {...props} if={!value} then={Component} />`,
    `${branchImport}<Branch if={!/* keep */ value} then={Component} />`,
    'const view = <Branch if={!value} then={Component} />',
    "import Branch from 'other'; const view = <Branch if={!value} then={Component} />",
    `${branchImport}function view(Branch) { return <Branch if={!value} then={Component} /> }`,
  ],
  invalid: [
    ...[
      ['<Branch if={!value} then={Component} />', '<Branch not={value} then={Component} />'],
      ['<Branch if={!(ready && enabled)} then={Component} />', '<Branch not={ready && enabled} then={Component} />'],
      ['<Branch if={!value}><Content /></Branch>', '<Branch not={value}><Content /></Branch>'],
      ['<Branch if={!(tick, value)} then={Component} />', '<Branch not={(tick, value)} then={Component} />'],
    ].map(([code, output]) => ({
      code: branchImport + code,
      output: branchImport + output,
      errors: [{messageId: 'prefer' as const}],
    })),
    ...[
      ["import B from 'branch-component'; ", 'B'],
      ["import {default as B} from 'branch-component'; ", 'B'],
      ["import * as branches from 'branch-component'; ", 'branches.default'],
    ].map(([prefix, tag]) => ({
      code: `${prefix}<${tag} if={!value} then={Component} />`,
      output: `${prefix}<${tag} not={value} then={Component} />`,
      errors: [{messageId: 'prefer' as const}],
    })),
  ],
})
