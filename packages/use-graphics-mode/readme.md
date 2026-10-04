# use-graphics-mode

A small, controlled React API for a two-level graphics mode. State is a boolean named `isHeavy`: `true` selects heavy rendering and `false` selects fast rendering. Consumers never need to compare or toggle enum values.

No renderer, global store, hardware detection, URL library or persistence dependency. The application owns the boolean and defines its rendering budgets.

## Usage

```tsx
import {useState} from 'react'
import useGraphicsMode, {GraphicsModeProvider, useGraphicsModeValue, useSetGraphicsMode} from 'use-graphics-mode'

const heavyBudget = {shadows: true, particles: 1000}
const fastBudget = {shadows: false, particles: 100}

function GraphicsButton() {
  const isHeavy = useGraphicsMode()
  const setIsHeavy = useSetGraphicsMode()
  return <button onClick={() => setIsHeavy(!isHeavy)}>{useGraphicsMode.getName(isHeavy)}</button>
}

function SceneBudget() {
  const budget = useGraphicsModeValue(isHeavy => isHeavy ? heavyBudget : fastBudget)
  return <output>{budget.particles} particles</output>
}

function App() {
  const [isHeavy, setIsHeavy] = useState(true)
  return <GraphicsModeProvider isHeavy={isHeavy} onChange={setIsHeavy}>
    <GraphicsButton/>
    <SceneBudget/>
  </GraphicsModeProvider>
}
```

## API

- `GraphicsModeProvider`: requires `isHeavy: boolean`, `onChange(isHeavy: boolean)` and `children`. It neither mirrors nor mutates the supplied state.
- `useGraphicsMode(): boolean`: reads the nearest provider’s `isHeavy`.
- `useGraphicsMode.getName(isHeavy: boolean)`: returns `'heavy'` for `true` or `'fast'` for `false`. This pure formatter works outside React and does not require a provider.
- `useSetGraphicsMode()`: returns the nearest provider’s original boolean change callback.
- `useGraphicsModeValue(select)`: calls `select(isHeavy)`, preserving the selected value’s identity and inferred type without enum-keyed records.

Hooks throw clearly outside a provider. `false` is a valid setting, not a missing provider. Nested providers isolate their booleans and callbacks. Separate value and callback contexts avoid subscribing read-only consumers to callback changes. There is no module-owned mutable state, so independent roots and server renders cannot leak preferences into each other.

## Renderer integration

Place the provider above both the settings UI and the scene. Three Fiber bridges React context into its Canvas. Do not key the Canvas, physics world or gameplay subtree by `isHeavy`: changing a budget should not reset the game.

Selectors run during rendering and must be pure. Select existing values or resource factories, then instantiate selected factories inside lifecycle-aware hooks. Dispose owned GPU resources on replacement or unmount. Renderer constructor-only options cannot be made reactive by this package; keep them stable or implement an explicit renderer transition.

URL parsing, persistence, defaults, labels, frame budgets and material art direction belong to the consumer. Slop Gallery serializes `?graphics=fast` or `?graphics=heavy` through `getName`. It defaults to fast and disables procedural dirt/pot noise and ground reflections in that mode. Renderer scale defaults to 1× in fast mode and the device pixel ratio in heavy mode; `?scale=N` overrides either profile with any finite positive value.

## Development

Run `bun test` in this package. The repository’s normal root checks also cover the workspace package.
