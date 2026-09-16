import expandChildren from '../src/rules/expand-children.ts'
import simplifyChildren from '../src/rules/simplify-children.ts'
import {branchImport, ruleTester} from './ruleTester.ts'

const components = [
  ["import {Fragment as Content} from 'react'; ", 'Content'],
  ["import * as React from 'react'; ", 'React.Fragment'],
  ["import {memo} from 'react'; const Content = memo(() => null); ", 'Content'],
  ["import {forwardRef} from 'react'; const Content = forwardRef(() => null); ", 'Content'],
  ["import {lazy} from 'react'; const Content = lazy(() => import('./Content')); ", 'Content'],
]
ruleTester.run('simplify-children-exotic-components', simplifyChildren, {
  valid: components.flatMap(([prefix, name]) => [
    `${branchImport + prefix}<Branch if={ok}><${name} /></Branch>`,
    `${branchImport + prefix}<Branch if={ok} then={<${name} />} />`,
  ]),
  invalid: [],
})
ruleTester.run('expand-children-exotic-components', expandChildren, {
  valid: [],
  invalid: components.map(([prefix, name]) => ({
    code: `${branchImport + prefix}<Branch if={ok} then={<${name} />} />`,
    output: `${branchImport + prefix}<Branch if={ok}><${name} /></Branch>`,
    errors: [{messageId: 'expand' as const}],
  })),
})
