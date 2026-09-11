import type {EgoAction} from './types.ts'

/** Readonly bindings accepted by three-fiber-game; spread key arrays when using Drei directly. */
const egoControls = Object.freeze({
  forward: Object.freeze(['KeyW', 'ArrowUp']),
  backward: Object.freeze(['KeyS', 'ArrowDown']),
  left: Object.freeze(['KeyA', 'ArrowLeft']),
  right: Object.freeze(['KeyD', 'ArrowRight']),
  jump: 'Space',
  sprint: Object.freeze(['ShiftLeft', 'ShiftRight']),
  crouch: 'KeyC',
  interact: 'KeyE',
  zoom: 'KeyZ',
  dump: 'KeyX',
  modifier: Object.freeze(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']),
} satisfies Record<EgoAction, ReadonlyArray<string> | string>)

export default egoControls
