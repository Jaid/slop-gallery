import {positionView} from 'three/tsl'

/**
 * Object-space distance between neighboring screen pixels, measured on the shaded surface. Unlike
 * `fwidth()` of a procedural field this value does not depend on the field's own slope, so
 * anti-aliasing widths and coverage energies stay uniform across a surface. The derivative already
 * contains the foreshortening of grazing angles, so no facing correction is applied; the exhibition
 * knot is unscaled, which makes view units equal object units.
 */
export function pixelFootprint() {
  return positionView.dFdx().length().max(positionView.dFdy().length()).max(0.0000001)
}
