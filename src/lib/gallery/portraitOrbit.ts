import type {OrbitSettings} from '#src/lib/camera/OrbitInspection.ts'
import type {Portrait, Vec3} from './types.ts'

import {inspectionFov} from '#src/lib/camera/OrbitInspection.ts'

import {portraitLabelLayout} from './portraitLabel.ts'

/** how far the image stands in front of the portrait’s origin, the middle of its frame */
export const portraitImageDepth = 0.096

/**
 * Orbiting a hung portrait starts straight in front of it, filling the view at the inspection field of view. Inspecting the
 * name plate frames the portrait and its plate together, with room around both. The orbit stays in front
 * of the wall.
 */
export default function portraitOrbit(portrait: Portrait, label: boolean, aspect: number): {
  center: Vec3
  orbit: OrbitSettings
} {
  const layout = portraitLabelLayout(portrait.width, portrait.height, portrait.labelAbove)
  const bottom = label ? Math.min(-portrait.height / 2, layout.bottom) : -portrait.height / 2
  const top = label ? Math.max(portrait.height / 2, layout.top) : portrait.height / 2
  const normal: Vec3 = [Math.sin(portrait.rotation), 0, Math.cos(portrait.rotation)]
  const distance = Math.max(top - bottom + (label ? 0.4 : 0), portrait.width / aspect) / (2 * Math.tan(inspectionFov * Math.PI / 360)) * (label ? 1.14 : 1)
  return {
    // Measured from the image, not the frame’s middle behind it, which would crop the image’s edges.
    center: [portrait.position[0] + normal[0] * portraitImageDepth, portrait.position[1] + (top + bottom) / 2, portrait.position[2] + normal[2] * portraitImageDepth],
    orbit: {
      radius: Math.hypot(portrait.width, top - bottom) / 2,
      // The wall around the artwork stays sharp.
      blur: 0,
      distance,
      facing: normal,
      yawLimit: 1.2,
      pitchLimit: 0.9,
    },
  }
}
