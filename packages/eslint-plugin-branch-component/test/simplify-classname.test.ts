import rule from '../src/rules/simplify-classname.ts'
import {branchImport, ruleTester} from './ruleTester.ts'

ruleTester.run('simplify-classname', rule, {
  valid: [
    `${branchImport}<Branch if={ok}><Content className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={first} /><Other className={second} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={shared} /><Other /></Branch>`,
    `${branchImport}<Branch if={ok} then={Content}><Other className={shared} /><Third className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok} className={base}><Content className={shared} /><Other className={shared} /></Branch>`,
    `${branchImport}<Branch {...props} if={ok}><Content className={shared} /><Other className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content {...props} className={shared} /><Other className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={makeClass()} /><Other className={makeClass()} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={active && shared} /><Other className={active && shared} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={false} /><Other className={false} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={[shared]} /><Other className={[shared]} /></Branch>`,
    `${branchImport}<Branch if={ok}><Content className={/* keep */ shared} /><Other className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok} children={<Content className={shared} />}><Other className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok}>{content}<Content className={shared} /><Other className={shared} /></Branch>`,
    `${branchImport}<Branch if={ok}><Fragment><Content className={shared} /><Other className={shared} /></Fragment></Branch>`,
    'const view = <Branch if={ok}><Content className={shared} /><Other className={shared} /></Branch>',
    "import Branch from 'other'; const view = <Branch if={ok}><Content className={shared} /><Other className={shared} /></Branch>",
  ],
  invalid: [
    {
      code: `${branchImport}<Branch if={ok}><Content className={active ? css.active : undefined} /><Other className={active ? css.active : undefined} /></Branch>`,
      output: `${branchImport}<Branch if={ok} className={active ? css.active : undefined}><Content /><Other /></Branch>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok} then={<Success className={css.item} />} else={<Fallback className={css.item} />} />`,
      output: `${branchImport}<Branch if={ok} then={<Success />} else={<Fallback />} className={css.item}/>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok}><Content className='shared' /><Other className="shared" /></Branch>`,
      output: `${branchImport}<Branch if={ok} className='shared'><Content /><Other /></Branch>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok} then={<Header className={shared} />}><Content className={shared} /></Branch>`,
      output: `${branchImport}<Branch if={ok} then={<Header />} className={shared}><Content /></Branch>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok} children={<Content className={shared} />} else={<Fallback className={shared} />} />`,
      output: `${branchImport}<Branch if={ok} children={<Content />} else={<Fallback />} className={shared}/>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok}><><Content className={shared} /><Other className={shared} /></></Branch>`,
      output: `${branchImport}<Branch if={ok} className={shared}><><Content /><Other /></></Branch>`,
      errors: [{messageId: 'simplify'}],
    },
    {
      code: `${branchImport}<Branch if={ok} children={[<Content className={shared} />, <Other className={shared} />]} />`,
      output: `${branchImport}<Branch if={ok} children={[<Content />, <Other />]} className={shared}/>`,
      errors: [{messageId: 'simplify'}],
    },
    ...[
      ["import B from 'branch-component'; ", 'B'],
      ["import {default as B} from 'branch-component'; ", 'B'],
      ["import * as branches from 'branch-component'; ", 'branches.default'],
    ].map(([prefix, tag]) => ({
      code: `${prefix}<${tag} if={ok}><Content className={shared} /><Other className={shared} /></${tag}>`,
      output: `${prefix}<${tag} if={ok} className={shared}><Content /><Other /></${tag}>`,
      errors: [{messageId: 'simplify' as const}],
    })),
  ],
})
