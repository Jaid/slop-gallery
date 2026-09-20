import type {InspectionState, MutableRef} from './types.ts'
import type {RootState} from '@react-three/fiber/webgpu'

import {useEffect} from 'react'
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js'

import {markControlled} from '#src/lib/gallery.ts'

export default function useInspectionPointer(controls: RootState['controls'], renderer: RootState['renderer'], view: MutableRef<InspectionState | null>) {
  useEffect(() => {
    if (!(controls instanceof PointerLockControls)) {
      return
    }
    const mousemove = (event: MouseEvent) => {
      if (controls.isLocked && document.pointerLockElement === renderer.domElement && (event.movementX || event.movementY)) {
        markControlled()
      }
      const viewing = view.current
      if (!viewing || viewing.returning || !controls.isLocked || document.pointerLockElement !== renderer.domElement) {
        return
      }
      const sensitivity = 0.002 * controls.pointerSpeed
      viewing.look.addInput(-event.movementX * sensitivity, -event.movementY * sensitivity)
    }
    document.addEventListener('mousemove', mousemove)
    return () => document.removeEventListener('mousemove', mousemove)
  }, [controls, renderer, view])
}
