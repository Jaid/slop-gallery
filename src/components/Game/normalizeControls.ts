import type {KeyboardControlsEntry} from '@react-three/drei/webgpu'
import type {Arrayable} from 'type-fest'

import {castArray} from 'es-toolkit/compat'

export type Controls<Actions extends string = string> = Array<KeyboardControlsEntry<Actions>> | Record<Actions, Arrayable<string>>
const normalizeControls = <Actions extends string>(controls: Controls<Actions>): Array<KeyboardControlsEntry<Actions>> => {
  if (Array.isArray(controls)) {
    return controls
  }
  return (Object.entries(controls) as Array<[Actions, Arrayable<string>]>).map(([action, keys]) => {
    return {
      name: action,
      keys: castArray(keys),
    }
  })
}
export default normalizeControls
