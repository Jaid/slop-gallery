import type {EgoInput, EgoState} from './types.ts'
import type {Camera, Object3D} from 'three/webgpu'

import {OrthographicCamera, PerspectiveCamera, Quaternion} from 'three/webgpu'

import AimInspector from './AimInspector.ts'

export type EgoDump = ReturnType<EgoDiagnostics['capture']>

/** Detached, serializable snapshots with full-precision world-space surface placement data. */
export default class EgoDiagnostics {
  private readonly inspector: AimInspector

  constructor(scene: Object3D, private readonly camera: Camera) {
    this.inspector = new AimInspector(scene, camera)
  }

  capture(state: EgoState, input: EgoInput) {
    const aim = this.inspector.getAim()
    const {camera} = this
    return {
      id: crypto.randomUUID(),
      time: (new Date).toISOString(),
      player: structuredClone(state),
      input: {...input},
      camera: {
        type: camera.type,
        position: {...aim.origin},
        quaternion: camera.getWorldQuaternion(new Quaternion).toArray(),
        matrixWorld: camera.matrixWorld.toArray(),
        projectionMatrix: camera.projectionMatrix.toArray(),
        fov: camera instanceof PerspectiveCamera ? camera.fov : null,
        aspect: camera instanceof PerspectiveCamera ? camera.aspect : null,
        near: camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera ? camera.near : null,
        far: camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera ? camera.far : null,
        layers: camera.layers.mask,
      },
      aim,
    }
  }
}
