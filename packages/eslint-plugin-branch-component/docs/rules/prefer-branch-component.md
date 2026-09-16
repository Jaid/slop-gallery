# branch-component/prefer-branch-component

Prefer Branch elements for conditional rendering. This rule is fixable and takes no options.

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

The rule also handles string/number ternaries directly inside JSX children and Boolean `&&` guards such as `count > 0 && <Content />`, `!!visible && <Content />`, `Boolean(visible) && <Content />`, and identifiers explicitly annotated as `boolean`.

Ordinary value computations and conditional string props are not targeted:

```tsx
const width = ready ? 100 : 50
const view = <div className={ready ? 'active' : 'idle'} />
```

Unknown `&&` conditions, `||`, and `??` are left alone. In particular, `count && <Content />` can render `0`; replacing it with a truthiness-only branch could hide that output. The rule does not require type-checker services or infer Boolean types from arbitrary expressions.

## Imports

An existing, unshadowed default import is reused, including renamed default imports and namespace `.default` access. Otherwise the fixer inserts a default import named `BranchComponent`, adding a numeric suffix when needed. Type-only imports are never reused as values. Import insertion preserves shebangs, directives, comments, quote style and line endings. Script/CommonJS source mode is reported without adding an ESM import.

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
