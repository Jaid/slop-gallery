import type {RapierCollider, TrimeshColliderProps} from '@react-three/rapier'

import {TrimeshCollider, useRapier} from '@react-three/rapier'
import {useCallback} from 'react'

/** Welded triangles should behave like one surface, not catch objects on internal edges. */
export default function MeshSurfaceCollider({args, ...props}: Omit<TrimeshColliderProps, 'args'> & {args: [Float32Array, Uint32Array]}) {
  const {rapier} = useRapier()
  const initialize = useCallback((collider: RapierCollider | null) => {
    collider?.setShape(new rapier.TriMesh(args[0], args[1], rapier.TriMeshFlags.FIX_INTERNAL_EDGES))
  }, [args, rapier])
  return <TrimeshCollider {...props} ref={initialize} args={args}/>
}
