import type {InspectionState, MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {useEffect} from 'react'
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'

import inspectionPointerSensitivity from '#src/lib/camera/inspectionPointerSensitivity.ts'
import {markControlled} from '#src/lib/gallery.ts'

export default function useInspectionPointer(controls: RootState['controls'], renderer: RootState['renderer'], view: MutableRef<InspectionState | null>) {
  useEffect(() => {
    if (!(controls instanceof PointerLockControls)) {
      return
    }
    let precision = false
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'KeyC') {
        precision = true
      }
    }
    const keyup = (event: KeyboardEvent) => {
      if (event.code === 'KeyC') {
        precision = false
      }
    }
    const blur = () => {
      precision = false
    }
    const mousemove = (event: MouseEvent) => {
      if (controls.isLocked && document.pointerLockElement === renderer.domElement && (event.movementX || event.movementY)) {
        markControlled()
      }
      const viewing = view.current
      if (!viewing || viewing.returning || !controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      const sensitivity = inspectionPointerSensitivity(0.002 * controls.pointerSpeed, precision, event.shiftKey)
      viewing.look.addInput(-event.movementX * sensitivity, -event.movementY * sensitivity)
    }
    globalThis.addEventListener('keydown', keydown)
    globalThis.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    document.addEventListener('mousemove', mousemove)
    return () => {
      globalThis.removeEventListener('keydown', keydown)
      globalThis.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', blur)
      document.removeEventListener('mousemove', mousemove)
    }
  }, [controls, renderer, view])
}
