import {LatheGeometry, Vector2} from 'three/webgpu'

export const potPhysics = {mass: 4.6, restitution: 0.18, friction: 0.85} as const
export const soilSurface = {radius: 0.333, center: 0.615, halfHeight: 0.015} as const
export const potGeometry = new LatheGeometry([
  new Vector2(0, 0),
  new Vector2(0.27, 0),
  new Vector2(0.38, 0.72),
  new Vector2(0.344, 0.72),
  new Vector2(0.242, 0.055),
  new Vector2(0, 0.055),
], 64)
// Keep the approved clay pores at the same vertical scale on the outer and inner walls.
const positions = potGeometry.getAttribute('position')
const uv = potGeometry.getAttribute('uv')
for (let i = 0; i < positions.count; i++) uv.setY(i, positions.getY(i) / 0.72)
export const potVertices = Float32Array.from(potGeometry.getAttribute('position').array)

if (import.meta.hot) import.meta.hot.dispose(() => potGeometry.dispose())
