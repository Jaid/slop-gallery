import rule from '../src/rules/simplify-children.ts'
import {branchImport, ruleTester} from './ruleTester.ts'

const nestedCases = [
  ['<Branch if={ok}><Content /></Branch>', '<Branch if={ok} then={Content} />', 'Content'],
  ['<Branch if={ok}><Content></Content></Branch>', '<Branch if={ok} then={Content} />', 'Content'],
  ['<Branch if={ok}>\n  <Content />\n</Branch>', '<Branch if={ok} then={Content} />', 'Content'],
  ['<Branch if={ok}>\n  <Content>\n  </Content>\n</Branch>', '<Branch if={ok} then={Content} />', 'Content'],
  ['<Branch if={ok}>{<Content />}</Branch>', '<Branch if={ok} then={Content} />', 'Content'],
  ['<Branch if={ok}><ui.Content /></Branch>', '<Branch if={ok} then={ui.Content} />', 'ui.Content'],
]
const propCases = [
  ['<Content />', 'Content', 'Content'],
  ['(<Content />)', '(Content)', 'Content'],
  ['/* keep */ <Content />', '/* keep */ Content', 'Content'],
  ['<UI.Content />', 'UI.Content', 'UI.Content'],
]
ruleTester.run('simplify-children', rule, {
  valid: [
    ...[
      '<Branch if={ok} then={Content} else={Fallback} />',
      '<Branch if={ok} children={value} />',
      '<Branch if={ok}><div /></Branch>',
      '<Branch if={ok}><Content value={value} /></Branch>',
      '<Branch if={ok}><Content key="stable" /></Branch>',
      '<Branch if={ok}><Content ref={ref} /></Branch>',
      '<Branch if={ok}><Content {...props} /></Branch>',
      '<Branch if={ok}><Content>text</Content></Branch>',
      '<Branch if={ok}><Content> </Content></Branch>',
      '<Branch if={ok}><Content /> </Branch>',
      '<Branch if={ok}><Content /><Other /></Branch>',
      '<Branch if={ok}><><Content /></></Branch>',
      '<Branch if={ok}>{/* keep */}<Content /></Branch>',
      '<Branch if={ok}>{/* keep */ <Content />}</Branch>',
      '<Branch if={ok}><Content>{/* keep */}</Content></Branch>',
      '<Branch if={ok} children={<Content />}><Other /></Branch>',
      '<Branch if={ok} children={<Content />} children={<Other />} />',
      '<Branch if={ok} then={<Content />} then={<Other />} />',
      '<Branch if={ok} else={<Content />} else={<Other />} />',
      '<Branch if={ok} then={Header}><Content /></Branch>',
      '<Branch if={ok} then={Header} children={<Content />} />',
      '<Branch if={ok} children={<Content />} {...props} />',
      '<Branch if={ok} {...props} children={<Content />} />',
      '<Branch {...props}><Content /></Branch>',
      '<Branch if={ok} then={() => <Content />} />',
      '<Branch if={ok} else={() => <Content />} />',
      '<Branch if={ok}><Content<string> /></Branch>',
      '<Branch if={ok} then={<Content<string> />} />',
      '<Branch if={ok} else={<Content value={value} />} />',
      '<Branch if={ok}><svg:path /></Branch>',
      'function view(Branch) { return <Branch><Content /></Branch> }',
    ].map(code => branchImport + code),
    'const view = <Branch><Content /></Branch>',
    "import Branch from 'other'; const view = <Branch then={<Content />} />",
    "import type Branch from 'branch-component'; const view = <Branch><Content /></Branch>",
    "import {Branch} from 'branch-component'; const view = <Branch><Content /></Branch>",
    "import * as branches from 'branch-component'; const view = <branches.Other><Content /></branches.Other>",
  ],
  invalid: [
    ...nestedCases.map(([code, output, component]) => ({
      code: branchImport + code,
      output: branchImport + output,
      errors: [{
        messageId: 'simplify' as const,
        data: {
          component,
          prop: 'then',
        },
      }],
    })),
    ...['then', 'else', 'children'].flatMap(inputProp => propCases.map(([input, output, component]) => {
      const prop = inputProp === 'children' ? 'then' : inputProp
      return {
        code: `${branchImport}<Branch if={ok} ${inputProp}={${input}} />`,
        output: `${branchImport}<Branch if={ok} ${prop}={${output}} />`,
        errors: [{
          messageId: 'simplify' as const,
          data: {
            component,
            prop,
          },
        }],
      }
    })),
    ...[
      ["import B from 'branch-component'; ", 'B'],
      ["import {default as B} from 'branch-component'; ", 'B'],
      ["import * as branches from 'branch-component'; ", 'branches.default'],
    ].map(([prefix, tag]) => ({
      code: `${prefix}const view = <${tag} if={ok}><Content /></${tag}>`,
      output: `${prefix}const view = <${tag} if={ok} then={Content} />`,
      errors: [{
        messageId: 'simplify' as const,
        data: {
          component: 'Content',
          prop: 'then',
        },
      }],
    })),
    {
      code: `${branchImport}<Branch if={ok} then={<Content />} else={<Fallback />} />`,
      output: `${branchImport}<Branch if={ok} then={Content} else={Fallback} />`,
      errors: [
        {
          messageId: 'simplify',
          data: {
            component: 'Content',
            prop: 'then',
          },
        },
        {
          messageId: 'simplify',
          data: {
            component: 'Fallback',
            prop: 'else',
          },
        },
      ],
    },
    ...[
      ['<Branch if={ok} then={<Header />}><Content /></Branch>', '<Branch if={ok} then={Header}><Content /></Branch>', 'Header', 'then'],
      ['<Branch if={ok} then={<Header />} children={<Content />} />', '<Branch if={ok} then={Header} children={<Content />} />', 'Header', 'then'],
      ['<Branch if={ok} {...props} then={<Content />} />', '<Branch if={ok} {...props} then={Content} />', 'Content', 'then'],
      ['<Branch if={ok} else={<Fallback />} {...props} />', '<Branch if={ok} else={Fallback} {...props} />', 'Fallback', 'else'],
    ].map(([code, output, component, prop]) => ({
      code: branchImport + code,
      output: branchImport + output,
      errors: [{
        messageId: 'simplify' as const,
        data: {
          component,
          prop,
        },
      }],
    })),
  ],
})
