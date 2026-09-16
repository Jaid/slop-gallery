# eslint-plugin-branch-component

Scope-aware ESLint autofixes for `branch-component`, authored in TypeScript with a flat-config entry point. Component references go through `then` and `else`; nested children remain React nodes. Compatible with the repository's `branch-component@0.4.0` runtime and branch-baking plugins without changing their APIs.

## Configuration

The package follows the workspace's source-first ESM convention. Load it with Bun or a TypeScript-capable loader. Add the preset after your existing JavaScript/TypeScript configuration:

```ts
import branchComponent from 'eslint-plugin-branch-component'

export default [
  // Existing configuration, including your TSX parser when applicable.
  branchComponent.configs.recommended,
]
```

The preset registers the plugin and enables all five rules for `**/*.{jsx,tsx}`. It enables JSX syntax without replacing your parser. Extend its `files` pattern to lint JSX in `.js` files. Alternatively, register `plugins: {'branch-component': branchComponent}` and select rules individually.

The repository root ESLint configuration includes this preset after `makeEslintConfig()`, enabling all five rules for JSX and TSX files across the workspace.

## Rules

| Rule | Autofix |
| --- | --- |
| [prefer-branch-component](docs/rules/prefer-branch-component.md) | Replace non-trivial rendering ternaries and explicitly Boolean JSX guards with Branch elements; insert or reuse the import. |
| [prefer-positive](docs/rules/prefer-positive.md) | Replace negated `if={!value}` conditions with `not={value}`. |
| [simplify-classname](docs/rules/simplify-classname.md) | Hoist identical top-level output `className` props to `Branch`. |
| [simplify-children](docs/rules/simplify-children.md) | Replace bare component elements with `then={Content}` or `else={Fallback}`. |
| [expand-children](docs/rules/expand-children.md) | Move complex successful JSX from `then` or an explicit `children` prop into nested children. |

`prefer-branch-component` accepts `keepPrimitives` (default `true`) and `name` (default `Branch`); the other rules take no options. With the preset enabled:

```tsx
// Before
ready ? <Content /> : <Fallback />
<Branch if={ready}><Content /></Branch>
<Branch if={ready} then={<Content />} else={<Fallback />} />
<Branch if={!hidden} then={Content} />
<Branch if={ready} then={<Content className={css.item} />} else={<Fallback className={css.item} />} />
<Branch if={ready} then={<div><Content /></div>} />

// After
<Branch if={ready} else={Fallback} then={Content} />
<Branch if={ready} then={Content} />
<Branch if={ready} then={Content} else={Fallback} />
<Branch not={hidden} then={Content} />
<Branch if={ready} else={Fallback} className={css.item} then={Content} />
<Branch if={ready}><div><Content /></div></Branch>
```

The two children rules have disjoint targets. Bare component elements are candidates for simplification; other JSX can be expanded. `expand-children` never turns a component reference back into JSX, so the rules can run together without an autofix loop.

Complex `else` JSX stays in the fallback prop. Moving it into nested children would put it in the successful branch. Likewise, `then` and children are additive: existing content is never overwritten to obtain a shorter form.

## Fix boundaries

The rules identify the actual default import from `branch-component`, including aliases, `{default as Branch}`, and namespace `.default` access. Unrelated components, shadowed bindings and type-only imports are ignored. Import insertion uses a collision-free name and retains directives, shebangs, leading comments, quote/semicolon style and line endings.

Fixes retain meaningful whitespace, comments, props, keys, refs and TypeScript type arguments. They decline transformations that would discard these or change spread precedence. Conditional fixes also reject guarded calls/property accesses and other potentially observable eager evaluation; these cases are reported for manual refactoring instead of receiving unsafe autofixes.

These are rendering-style rules, not whole-program equivalence proofs. They work without a TypeScript project, treating otherwise unknown component names as ordinary callable components. Known React built-ins and factory-produced local components are kept as JSX because `branch-component@0.4.0` does not render exotic object/symbol references. When type-checker services are available, the shared component check also recognizes the `$$typeof` marker on imported exotic components. Without types, an imported component's implementation cannot be established from its name alone.

## Development

```sh
# From this package directory:
bun run test

# From the repository root:
bun test --max-concurrency 1 ./packages/eslint-plugin-branch-component/test
bun run typecheck
bun run eslint packages/eslint-plugin-branch-component --max-warnings 0
```

The suite uses typescript-eslint's RuleTester, real ESLint `verifyAndFix` integration tests with both Espree and the TypeScript parser, and render comparisons against the installed Branch runtime. It covers all five rules together, import collisions and shadowing, comments, meaningful whitespace, evaluation-order hazards, additive outputs and multi-pass convergence.
