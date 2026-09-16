# branch-component/simplify-children

Pass a bare component through `then` or `else` instead of instantiating it. This rule is fixable and takes no options.

```tsx
// Before
<Branch if={visible}><Content /></Branch>
<Branch if={visible} then={<Content />} />
<Branch if={visible} else={<Fallback />} />
<Branch if={visible} children={<Content />} />

// After
<Branch if={visible} then={Content} />
<Branch if={visible} then={Content} />
<Branch if={visible} else={Fallback} />
<Branch if={visible} then={Content} />
```

`children={Content}` is never generated: `branch-component` accepts component references through `then` and `else`, not through `children`.

Empty paired tags, indentation-only multiline whitespace, JSX expression containers and member components are recognized:

```tsx
<Branch if={visible}><Content></Content></Branch>
<Branch if={visible}>{<Content />}</Branch>
<Branch if={visible} then={<UI.Content />} />

// Become:
<Branch if={visible} then={Content} />
<Branch if={visible} then={Content} />
<Branch if={visible} then={UI.Content} />
```

The actual import binding is resolved rather than guessed from the spelling `Branch`. Unrelated or shadowed components and type-only imports are ignored.

## Preserve additive outputs

When both `then` and children exist, both render. Simplifying an existing `then` or `else` element is still supported, but children are never moved into an occupied `then` slot:

```tsx
// Before
<Branch if={visible} then={<Header />}><Content /></Branch>

// After: both outputs are preserved
<Branch if={visible} then={Header}><Content /></Branch>
```

A spread may supply `then` or `children`, so moving between those slots is also avoided when a spread exists. Replacing an element within an explicit `then`/`else` attribute does not change spread precedence.

## What stays as JSX

Intrinsic/custom elements, fragments, multiple children, meaningful text, comments that would be removed, and components with any props remain JSX. This includes `key`, `ref`, spreads and TypeScript type arguments.

```tsx
<Branch if={visible}><div /></Branch>
<Branch if={visible}><Content key="stable" /></Branch>
<Branch if={visible} else={<Fallback value={value} />} />
<Branch if={visible}><Content<string> /></Branch>
<Branch if={visible}><Content> </Content></Branch>
```

Known React built-ins and local factory-produced components remain JSX because the installed Branch runtime renders function references, not React exotic object/symbol references. Type-checker services, when available, additionally identify imported exotic components through their `$$typeof` marker. In syntax-only use, unknown imported components are assumed to be callable; review exotic component imports accordingly.

Duplicate output attributes and simultaneous nested children plus a `children` attribute are not normalized.

## Using both children rules

`expand-children` shares the same component-reference check and leaves simplifiable elements alone. Neither rule expands a component reference. Both can be enabled together without oscillating.
