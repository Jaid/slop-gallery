import type {RapierRigidBody} from '@react-three/rapier'
import type {Group} from 'three/webgpu'

const portraitObjects = new Map<string, {body: RapierRigidBody
  group: Group}>

export default portraitObjects
