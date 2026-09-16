# branch-component/simplify-classname

Hoist identical `className` props from multiple top-level Branch outputs to the `Branch` element itself. This rule is fixable and takes no options.

```tsx
// Before
<Branch
  if={ready}
  then={<Content className={css.item} />}
  else={<Fallback className={css.item} />}
/>

// After
<Branch
  if={ready}
  className={css.item}
  then={<Content />}
  else={<Fallback />}
/>
```

Nested children, fragments, arrays, `then`, `else` and an explicit `children` prop are supported when their top-level elements all receive the same class:

```tsx
// Before
<Branch if={ready}>
  <Header className={css.item} />
  <Content className={css.item} />
</Branch>

// After
<Branch if={ready} className={css.item}>
  <Header />
  <Content />
</Branch>
```

String literals are compared by value, so different quote styles can still be hoisted. Expression values must be textually identical.

The rule requires at least two matching occurrences. It skips transformations when another top-level element would newly receive the class, when an output is dynamically unknown, when Branch or a target element uses spread attributes, or when Branch already has `className`. Hoisted expressions must also have a string/nullish-shaped result without observable calls: identifiers, member access, templates and safe conditionals are supported, while boolean-producing logical expressions and array-valued child props are left alone. Comments inside a removed `className` attribute also prevent the fix.

This conservative boundary keeps the transformation aligned with `branch-component`’s class forwarding behavior rather than treating arbitrary descendants as equivalent targets.
