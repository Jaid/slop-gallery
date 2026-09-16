# branch-component/prefer-branch-component

Prefer Branch elements for conditional rendering. This rule is fixable.

```tsx
// Before
const view = ready ? <Content /> : <Fallback />

// After (with an existing Branch import)
const view = <Branch if={ready} else={<Fallback />}><Content /></Branch>
```

A null fallback is omitted. A null success branch uses `not`:

```tsx
// Before
const view = ready ? null : <Fallback />

// After
const view = <Branch not={ready}><Fallback /></Branch>
```

Boolean `&&` guards such as `count > 0 && <Content />`, `!!visible && <Content />`, `Boolean(visible) && <Content />`, and identifiers explicitly annotated as `boolean` are also handled.

Ordinary value computations and conditional props are not targeted:

```tsx
const width = ready ? 100 : 50
const view = <div className={ready ? 'active' : 'idle'} />
```

Unknown `&&` conditions, `||`, and `??` are left alone. In particular, `count && <Content />` can render `0`; replacing it with a truthiness-only branch could hide that output. The rule does not require type-checker services or infer Boolean types from arbitrary expressions.

## Options

### `keepPrimitives`

Type: `boolean`

Default: `true`

Keep JSX-child ternaries when both branches are syntactically primitive values. This avoids turning simple labels into Branch elements:

```tsx
<h3>{level.lower ? 'Lower level' : 'Upper level'}</h3>
<button>{apiKey ? 'Update' : 'Connect'}</button>
<small>{isQuality ? 'Quality' : 'Performance'}</small>
<small>{status === 'preparing' ? 'Preparing narration…' : playing}</small>
```

String, number, Boolean and null literals are primitives, as are template literals and expressions whose syntax guarantees a primitive result, such as unary and binary expressions. A ternary with JSX on either side is still converted.

Set `keepPrimitives: false` to retain the previous behavior:

```ts
{
  'branch-component/prefer-branch-component': ['warn', {keepPrimitives: false}],
}
```

Then a JSX-child primitive ternary such as `{ready ? 'Yes' : 'No'}` is converted to Branch.

### `name`

Type: `string`

Default: `Branch`

Set the local name used when the fixer needs to insert a new default import:

```ts
{
  'branch-component/prefer-branch-component': ['warn', {name: 'When'}],
}
```

```tsx
import When from 'branch-component'

const view = <When if={ready}><Content /></When>
```

An existing, unshadowed default import is reused regardless of this option, including renamed default imports and namespace `.default` access. When a new import name is already occupied, the fixer adds a numeric suffix such as `Branch2`. Type-only imports are never reused as values. Import insertion preserves shebangs, directives, comments, quote style and line endings. Script/CommonJS source mode is reported without adding an ESM import.

## Eager evaluation

Branch props are evaluated before the component renders. An apparently straightforward rewrite can therefore break guarded code:

```tsx
// Reported without an autofix: user.name must remain guarded.
const view = user ? <Content name={user.name} /> : null

// Reported without an autofix: expensive() must not run on the other branch.
const view = ready ? <Content value={expensive()} /> : null
```

Calls, property accesses, spreads, updates, awaits and potentially effectful coercions in branch output prevent automatic conversion. Ordinary component elements, literals, identifiers, simple object/array literals, and event-handler closures are supported. The rule does not introduce inline function-component wrappers to work around eager evaluation.

Comments between ternary operands prevent a fix when their placement could not be preserved. Comments inside retained JSX remain intact. The rule is intended for React rendering, where adding a Branch component is intentional; it does not preserve arbitrary comparisons against the original element/null value.

With `simplify-children` enabled, a later fix pass can turn the result into `<Branch if={ready} else={Fallback} then={Content} />`, using the installed runtime's component-reference API.