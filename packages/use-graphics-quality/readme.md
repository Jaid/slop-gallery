# use-graphics-quality

A small, controlled React API for graphics quality. State is always a boolean named `isQuality`: `true` enables quality and `false` selects performance. Consumers never need to compare or toggle enum values.

No renderer, global store, hardware detection, URL library or persistence dependency. The application owns the boolean and defines its rendering budgets.

## Usage

```tsx
import {useState} from 'react'
import {GraphicsQualityProvider, useGraphicsQuality, useGraphicsQualityValue, useSetGraphicsQuality} from 'use-graphics-quality'

const detailedBudget = {shadows: true, particles: 1000}
const fastBudget = {shadows: false, particles: 100}

function GraphicsButton() {
  const isQuality = useGraphicsQuality()
  const setIsQuality = useSetGraphicsQuality()
  return <button onClick={() => setIsQuality(!isQuality)}>{useGraphicsQuality.getName(isQuality)}</button>
}

function SceneBudget() {
  const budget = useGraphicsQualityValue(isQuality => isQuality ? detailedBudget : fastBudget)
  return <output>{budget.particles} particles</output>
}

function App() {
  const [isQuality, setIsQuality] = useState(true)
  return <GraphicsQualityProvider isQuality={isQuality} onChange={setIsQuality}>
    <GraphicsButton/>
    <SceneBudget/>
  </GraphicsQualityProvider>
}
```

## API

- `GraphicsQualityProvider`: requires `isQuality: boolean`, `onChange(isQuality: boolean)` and `children`. It neither mirrors nor mutates the supplied state.
- `useGraphicsQuality(): boolean`: reads the nearest provider’s `isQuality`.
- `useGraphicsQuality.getName(isQuality: boolean)`: returns `'quality'` for `true` or `'performance'` for `false`. This pure formatter works outside React and does not require a provider.
- `useSetGraphicsQuality()`: returns the nearest provider’s original boolean change callback.
- `useGraphicsQualityValue(select)`: calls `select(isQuality)`, preserving the selected value’s identity and inferred type without enum-keyed records.

Hooks throw clearly outside a provider. `false` is a valid setting, not a missing provider. Nested providers isolate their booleans and callbacks. Separate value and callback contexts avoid subscribing read-only consumers to callback changes. There is no module-owned mutable state, so independent roots and server renders cannot leak preferences into each other.

## Renderer integration

Place the provider above both the settings UI and the scene. Three Fiber bridges React context into its Canvas. Do not key the Canvas, physics world or gameplay subtree by `isQuality`: changing a budget should not reset the game.

Selectors run during rendering and must be pure. Select existing values or resource factories, then instantiate selected factories inside lifecycle-aware hooks. Dispose owned GPU resources on replacement or unmount. Renderer constructor-only options cannot be made reactive by this package; keep them stable or implement an explicit renderer transition.

URL parsing, persistence, defaults, labels, frame budgets and material art direction belong to the consumer. Slop Gallery keeps state boolean while serializing `?graphics=performance` or `?graphics=quality` through `getName`. It defaults to quality and disables procedural dirt/pot noise and ground reflections only in performance mode.

## Development

Run `bun test` in this package. The repository’s `bun run check:package` also packs it and tests the archive in an isolated consumer.
