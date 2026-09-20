import type InspectionLook from '#src/lib/camera/InspectionLook.ts'
import type {Placement} from '#src/lib/gallery.ts'
import type {Group, Quaternion, Raycaster, Vector2, Vector3} from 'three/webgpu'

export type MutableRef<T> = {
  current: T
}

export type InspectionState = {
  id: string
  look: InspectionLook
  position: Vector3
  restoreControls: () => void
  returning: boolean
  rotation: Quaternion
}

export type FirstPose = {
  position: Vector3
  rotation: Quaternion
}

export type InteractionFrameRefs = {
  cursor: MutableRef<Vector2>
  direction: MutableRef<Vector3>
  firstPose: MutableRef<FirstPose | null>
  ghost: MutableRef<Group | null>
  introduced: MutableRef<boolean>
  placement: MutableRef<Placement | null>
  previousHeld: MutableRef<string | null>
  ray: MutableRef<Raycaster>
  view: MutableRef<InspectionState | null>
}
