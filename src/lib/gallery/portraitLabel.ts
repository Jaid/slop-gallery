import type {Object3D} from 'three/webgpu'

// Shared by the hung label, its placement preview and wall clearance checks.
const portraitLabel = {
  height: 0.31,
  depth: 0.045,
  offset: 0.37,
  clearance: 0.055,
  neighborClearance: 0.125,
}

/** The placard of a frame, centered below it or, for a low hang, above it. */
export function portraitLabelLayout(width: number, height: number, above = false) {
  const y = above ? height / 2 + portraitLabel.offset : -height / 2 - portraitLabel.offset
  return {
    width: Math.min(width, 1.65),
    titleWidth: Math.min(width, 1.55),
    creatorWidth: Math.min(width, 1.5),
    y,
    bottom: y - portraitLabel.height / 2,
    top: y + portraitLabel.height / 2,
  }
}

// Text and backing meshes share the label marker; the frame itself does not.
export function isPortraitLabelHit(object: Object3D, portrait: Object3D) {
  for (let current: Object3D | null = object; current && current !== portrait; current = current.parent) {
    if (current.userData.portraitLabel === true) {
      return true
    }
  }
  return false
}

export default portraitLabel
