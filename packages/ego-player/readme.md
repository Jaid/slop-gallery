# ego-player

A composable first-person player for WebGPU React Three Fiber and Rapier: capsule collisions, acceleration, air control, sprinting, directional dodging, crouch clearance, buffered variable-height jumps, coyote time, stairs, slopes and a smoothed camera.

The package owns movement, not your game. Input is an explicit reader; audio, menus, inspection, navigation and telemetry belong to the application. There are no gallery imports, singleton player state, hardcoded DOM selectors or storage dependencies.

This ESM package exports TypeScript source for modern Bun and bundler consumers, following the repository’s other packages. It is not published yet.

## Quick start

```tsx
import type {EgoAction} from 'ego-player'
import {useKeyboardControls} from '@react-three/drei/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import EgoPlayer, {egoControls} from 'ego-player'
import Game from 'three-fiber-game'

function Player() {
  const input = useKeyboardControls<EgoAction>()[1]
  return <EgoPlayer input={input} position={[0, 0.05, 4]}/>
}

export default function App() {
  return <Game controls={egoControls} physics>
    <Player/>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[20, 0.1, 20]} position={[0, -0.1, 0]}/>
    </RigidBody>
  </Game>
}
```

Click the canvas to lock the pointer; Escape unlocks it. The example supplies a physical floor but leaves its visual appearance to you. Provide a nonzero-sized canvas container and a Suspense boundary for physics loading.

`three-fiber-game` is convenient, not a dependency. Alternatively mount `EgoPlayer` inside WebGPU `Canvas` and Rapier `Physics`, with a Drei `KeyboardControls` provider outside Canvas. Convert the readonly bindings for Drei directly:

```tsx
const map = Object.entries(egoControls).map(([name, keys]) => ({
  name,
  keys: typeof keys === 'string' ? [keys] : [...keys],
}))
```

Defaults: W/A/S/D or arrow keys, Space to jump, Shift to sprint/dodge and C to crouch. `egoControls` and its arrays are frozen; create your own mapping to rebind them.

## Input and ownership

`input: () => EgoInput` is the only required prop. It is read once before each physics step, without setting React state. Actions are boolean `forward`, `backward`, `left`, `right`, `jump`, `crouch` and `sprint`; missing actions are false. Readers may return a shared object and extra application actions are ignored. Diagonal movement is normalized.

No keyboard provider is required for custom input:

```tsx
const input = {forward: false, jump: false}

<EgoPlayer input={() => input} pointerLock={false} requirePointerLock={false}/>
```

Update that object from your own controller or input system.

| Prop | Behavior |
| --- | --- |
| `enabled` | Defaults to true. False suppresses input and buffered jumps while deceleration, gravity and collisions continue. It does not pause physics or disable mouse look. |
| `requirePointerLock` | Defaults to true. Input requires a lock on this canvas, not an unrelated element. |
| `pointerLock` | Defaults to true. An object forwards Drei options such as `selector`, `pointerSpeed`, `enabled`, `onLock`, `onUnlock` and `makeDefault`. The component supplies the canvas and defaults `makeDefault` to true. False omits look controls but does not implicitly change the lock requirement. |
| `cameraEnabled` | Defaults to true. False releases camera **position** while movement and camera smoothing continue. Control mouse look separately through `pointerLock.enabled` or the default Three controls. |

Both `enabled` and `cameraEnabled` accept a boolean or synchronous predicate. Predicates can read mutable state or an external store without a subscription.

For inspection or a cutscene, disable input and camera positioning, then disable the look controls while your camera system owns rotation. Application-managed pointer locking can pass a selector that matches only the intended lock button, or omit these controls entirely.

Only one `EgoPlayer` should own a given camera and default controls. Use separate roots/cameras or the lower-level motor for additional characters.

## Coordinates and refs

All coordinates are Y-up world coordinates. `position` and snapshots describe the **feet**, not the capsule center or camera. `height` includes the capsule’s round ends. Both eye-height options are distances above the feet. Put the player directly under an untransformed scene/physics root; transformed or scaled ancestors are not supported.

- `position` defaults to `[0, 0.05, 0]` and is read only on mount. Rerenders, new position arrays and option changes do not respawn the player.
- `yaw` defaults to 0 and uses radians. Updating it intentionally resets camera pitch and roll.
- `ref` exposes `body`, `getState()` and `teleport(feetPosition, cameraQuaternion?)`.
- `getState()` returns a detached, readonly-typed snapshot, or null before setup and after cleanup. It contains `active`, `grounded`, `crouching`, `position` and collision-resolved `velocity`. Velocity excludes camera smoothing, bobbing and inspection.
- Teleport resets velocity, ground/coyote history, buffered jumps and camera bob/smoothing. A held jump does not become a fresh press. It preserves crouch state, uses that stance’s eye height and optionally normalizes the supplied camera quaternion.
- Teleport explicitly updates the camera even when `cameraEnabled` is false. It does not find a safe destination, clamp to a floor or exit an application inspection mode. Calls before setup are no-ops; use `getState()` to check readiness.

```tsx
import type {EgoPlayerHandle} from 'ego-player'
import {useRef} from 'react'

// Inside your component:
const player = useRef<EgoPlayerHandle>(null)

// In a navigation handler after mounting:
player.current?.teleport([4, 0.04, -2], [0, 1, 0, 0])

// Feed a telemetry adapter without subscribing to React state:
const sample = player.current?.getState()
```

Supply finite positions and finite, nonzero quaternions. Use `userData` to tag the body for your collision/interaction systems; the package assigns no application-specific tags. Optional children attach to the feet-relative body; they do not automatically follow camera bob or crouch height.

## Callbacks

- `onInput(input)`: before movement when input is active and at least one player action is pressed.
- `onUpdate(state)`: after each physics step with a detached snapshot. Reading the ref on demand avoids these per-step allocations.
- `onStep(state)`: at a grounded stride’s downward bob trough, at most once per rendered frame. It works with `headBob={0}` and does not repeat across frames surrounding one trough.

Callbacks receive current props without remounting the player. The package never plays sounds or chooses a surface material.

## Tuning

Options are flat props and update without rebuilding the rigid body or losing momentum. `undefined` restores a default. `defaultEgoOptions` exports the frozen defaults. Nonfinite numeric options throw; finite out-of-range values are bounded where needed by the motor.

Distances use world units, speeds use world units per second, acceleration/gravity use world units per second squared and durations use seconds. A world unit conventionally represents a meter. Slope angles use degrees; `yaw` alone uses radians.

| Options | Defaults |
| --- | --- |
| `speed`, `sprintFactor`, `crouchFactor` | 3, 3, 0.7 |
| `dodgeFactor`, `dodgeJumpFactor` | 1.5, 1.1 |
| `acceleration`, `deceleration` | 18, 22 |
| `airAcceleration`, `airDeceleration` | 6, 1.5 |
| `height`, `radius`, `crouchHeight` | 1.6, 0.3, 1 |
| `eyeHeight`, `crouchEyeHeight` | 1.6, 0.9 |
| `jumpHeight`, `sprintJumpFactor`, `crouchJumpFactor` | 1.5, 1.3, 0.4 |
| `jumpReleaseFactor`, `jumpBufferTime`, `coyoteTime` | 0.55, 0.14, 0.12 |
| `gravity`, `fallGravityFactor`, `maxSpeedDown` | 9.81, 1.35, 30 |
| `contactOffset`, `snapToGround` | 0.02, 0.18 |
| `stepHeight`, `stepMinWidth` | 0.3, 0.2 |
| `maxSlopeAngle`, `slideAngle` | 50, 55 |
| `pushDynamicBodies`, `characterMass` | true, 80 |
| `cameraSharpness`, `headBob`, `headBobFrequency` | 18, 0.018, 1.8 |
| `maxDelta` | 0.05 |
| `collisionGroups` | all groups |

Crouching resizes the capsule synchronously before movement; standing is blocked when the full capsule would overlap an obstacle. Radius is at least 0.01, standing height is at least twice the radius and crouch height stays between those bounds. Geometry prop changes intentionally resize the body, so ensure it fits its surroundings.

Holding the `sprint` action while moving forward (including forward diagonals) uses `sprintFactor` and `sprintJumpFactor`. Holding it while moving sideways or backward is a **dodge** and uses `dodgeFactor` and `dodgeJumpFactor` instead. Direction is camera-relative and opposing keys cancel before classification: W + S + A dodges left, while W + A sprints diagonally. Both modes retain the normal acceleration and air-control behavior; dodge is a sustained directional boost, not a timed dash or invulnerability action.

Crouching suppresses both boosts. Without directional input, Shift + jump retains the existing `sprintJumpFactor` bonus. Factors are evaluated when a buffered jump launches, not when it was queued. Jump factors multiply jump **height**, not velocity. Releasing jump multiplies positive vertical velocity by `jumpReleaseFactor`. Grounded and airborne acceleration/deceleration are independent. Gravity is integrated by the motor, not inherited from the Physics world’s gravity.

A nonpositive `stepHeight` or `stepMinWidth` disables autostep; nonpositive `snapToGround` disables snapping. Autostep does not climb dynamic bodies. Actual traversability also depends on capsule shape, contact offset, approach and slope settings; the step-height setting is not a guarantee that every ledge below it is traversable. `characterMass={null}` lets Rapier derive character mass from the body. Collision groups filter both movement and stand-up clearance; sensors and disabled colliders are ignored.

`maxDelta` caps simulation catch-up per physics step, with a minimum cap of 1/240. It never enlarges an actual smaller timestep. Reported physical velocity still uses the actual physics interval. Render smoothing independently caps catch-up at 0.1 seconds. `headBobFrequency` is the base stride frequency; speed adjusts it. Zero head bob removes visual bobbing without muting stride callbacks.

## Lower-level motor

`EgoMotor` supports headless simulation and custom scene integration:

```ts
import {EgoMotor} from 'ego-player/motor'

const motor = new EgoMotor(rapier, world, body, capsuleCollider)
motor.step(world.timestep, input, camera.quaternion, true)
world.step()
const state = motor.getState()
motor.teleport([0, 0.04, 0])
motor.configure({speed: 4})
motor.dispose()
```

Supply a position-based kinematic body and its dedicated capsule collider from the same initialized Rapier instance/world. The motor owns that collider’s shape and collision groups and schedules body translation. It does not free the world, body or collider. Call `step` before each world step and read snapshots afterward. `configure` replaces options, restoring omitted defaults. `dispose` removes the character controller and is idempotent; dispose before freeing the world.

The `ego-player/motor` entry has no runtime React imports or browser globals and does not load Fiber, Drei or Rapier’s React bindings. The root entry also re-exports `EgoMotor` for convenience. Its public types reuse the Rapier peer’s types, so no second WASM runtime is bundled. The React component manages this lifecycle automatically.

## Dependencies and checks

Use the manifest’s peer versions: React 19, Three r186, Fiber 10’s WebGPU entry, Drei 11’s WebGPU entry and Rapier 2.2. All are peers, including Drei when `pointerLock={false}`. Use the same WebGPU Fiber module for Rapier and the host’s Canvas. With the current prerelease engine combination, Rapier’s bare Fiber import needs this host Vite alias:

```ts
resolve: {
  alias: [{find: /^@react-three\/fiber$/u, replacement: '@react-three/fiber/webgpu'}],
}
```

Do not bundle a second Fiber instance. The package deliberately adds no WebGL compatibility layer.

Run `bun test` in this directory. Tests exercise real Rapier movement, collisions, clearance, directional sprint/dodge boosts, jumps, teleport resets, independent motors and camera stride timing. A headless React/Fiber test covers Strict Mode, updates without respawning, canvas-specific lock gating, camera ownership, refs and cleanup. Its renderer is inert: this is not an interactive or visual playtest.

The repository’s `bun run check:package` packs the package and runs its public-API physics and React tests, typechecks consumers and bundles browser usage outside the workspace. Tests and consumer bundles explicitly match Vite’s ESM/WebGPU dependency resolution.
