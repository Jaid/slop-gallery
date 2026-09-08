import type {Controls} from '../Game/normalizeControls'

export type Actions = 'backward' | 'crouch' | 'forward' | 'jump' | 'left' | 'right' | 'sprint'
const controls: Controls<Actions> = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: 'Space',
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: 'KeyC',
}
export default controls
