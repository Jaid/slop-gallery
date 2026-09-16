# branch-component/expand-children

Move complex successful JSX between the Branch tags instead of putting it in a `then` prop. Explicit JSX `children` props can also be expanded. This rule is fixable and takes no options.

```tsx
// Before
<Branch if={visible} then={<div><Content /></div>} />
<Branch if={visible} children={<div><Content /></div>} />

// After (both cases)
<Branch if={visible}><div><Content /></div></Branch>
```

Intrinsic elements, fragments, components with props and JSX with meaningful children are supported. Conditions and fallback props are retained. Both self-closing and empty paired Branch elements are handled.

```tsx
// Before
<Branch if={visible} then={<Content value={value} />} else={Fallback} />
<Branch if={visible} then={<><Header /><Content /></>} />

// After
<Branch if={visible} else={Fallback}><Content value={value} /></Branch>
<Branch if={visible}><><Header /><Content /></></Branch>
```

## Compatible with simplification

Bare component elements are left alone because `simplify-children` owns that case, even when that rule is disabled. References, lazy functions, strings and arbitrary expressions are not expanded.

```tsx
// Unchanged by expand-children:
<Branch if={visible} then={<Content />} />
<Branch if={visible} then={Content} />
<Branch if={visible} then={() => <Content />} />
```

The shared component-reference check gives the two children rules disjoint targets, so enabling both does not create an autofix loop.

## Else and additive outputs

Complex `else` JSX stays in the fallback prop. Nested children are successful-branch content, so moving fallback JSX there would change its meaning.

Existing children are not overwritten or merged with a `then` output. `then` renders first, followed by children. This rule leaves that structure intact rather than changing fragment or child identity semantics.

```tsx
// Both unchanged:
<Branch if={visible} else={<aside><Fallback /></aside>} />
<Branch if={visible} then={<header>Header</header>}><Content /></Branch>
```

## Preservation boundaries

The rule resolves the actual `branch-component` import and ignores unrelated or shadowed components. Duplicate attributes and existing meaningful nested children are left alone. Moving `then` is avoided when any spread exists because that spread could provide children. An explicit `children` attribute can be moved past a preceding spread, but never past a later spread that could override it.

Comments inside the moved JSX are retained. Surrounding expression comments are reported without a fix rather than discarded. Moving JSX to the end of the props also requires preserving evaluation order: reads are not reordered across calls, getters or other potentially observable effects. Such cases are reported for manual editing.
