import {CylinderGeometry} from 'three/webgpu'

export const potPhysics = {mass: 4.6, restitution: 0.18, friction: 0.85} as const
export const potGeometry = new CylinderGeometry(0.38, 0.27, 0.72, 32).translate(0, 0.36, 0)
export const potVertices = Float32Array.from(potGeometry.getAttribute('position').array)

if (import.meta.hot) import.meta.hot.dispose(() => potGeometry.dispose())
