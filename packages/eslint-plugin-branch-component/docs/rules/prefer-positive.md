# branch-component/prefer-positive

Prefer the positive value with `not` instead of negating the value passed to `if`. This rule is fixable and takes no options.

```tsx
// Before
<Branch if={!hidden} then={Content} />

// After
<Branch not={hidden} then={Content} />
```

The rule applies regardless of output notation:

```tsx
<Branch if={!hidden}><Content /></Branch>

// Becomes:
<Branch not={hidden}><Content /></Branch>
```

Parenthesized conditions are simplified without changing their meaning:

```tsx
<Branch if={!(ready && enabled)} then={Content} />

// Becomes:
<Branch not={ready && enabled} then={Content} />
```

The actual `branch-component` import binding is resolved, so unrelated or shadowed components are ignored. The rule also skips Branch elements that already have `not`, contain spread attributes, use a double negation, or contain comments inside the negated expression where an autofix could discard source text.
