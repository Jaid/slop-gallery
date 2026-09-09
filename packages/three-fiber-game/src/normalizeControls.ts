import type {KeyboardControlsEntry} from '@react-three/drei/webgpu'

export type ControlBinding<Actions extends string = string> = Readonly<Omit<KeyboardControlsEntry<Actions>, 'keys'>> & {
  readonly keys: ReadonlyArray<string>
}
export type Controls<Actions extends string = string> = Readonly<Record<Actions, ReadonlyArray<string> | string>> | ReadonlyArray<ControlBinding<Actions>>

/** Accept compact action maps and full Drei entries, including readonly literals. */
export function normalizeControls<Actions extends string>(controls: Controls<Actions>): Array<KeyboardControlsEntry<Actions>> {
  if (Array.isArray(controls)) {
    return (controls as ReadonlyArray<ControlBinding<Actions>>).map(entry => ({
      ...entry,
      keys: [...entry.keys],
    }))
  }
  return (Object.entries(controls) as Array<[Actions, ReadonlyArray<string> | string]>).map(([name, keys]) => ({
    name,
    keys: typeof keys === 'string' ? [keys] : [...keys],
  }))
}
