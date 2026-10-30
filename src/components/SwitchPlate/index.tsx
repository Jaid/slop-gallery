import type {Material} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

import lightSwitch from '#src/lib/gallery/lightSwitch.ts'
import gold from '#src/lib/materials/gold.ts'

const {buttonRadius, buttonTravel, collar, plate, plateRadius, screw} = lightSwitch
/** long enough to reach from inside the plate to a popped-out button’s face */
const buttonLength = plate[2] + buttonTravel[1]
/** turns a cylinder’s axis from up to out of the wall */
const facing = [Math.PI / 2, 0, 0] as const

/** The gilt plate of a push-button switch with its two screws, the back of the plate on the wall at its origin. */
export default function SwitchPlate() {
  const geometry = useDisposable(useMemo(() => new RoundedBoxGeometry(...plate, 2, plateRadius), []))
  return <>
    <mesh material={gold} name='switch-plate' position={[0, 0, plate[2] / 2]} receiveShadow><primitive attach='geometry' object={geometry} /></mesh>
    {[screw.offset, -screw.offset].map(y => <mesh key={y} material={gold} name='switch-plate-screw' position={[0, y, plate[2] + screw.depth / 2]} rotation={facing}><cylinderGeometry args={[screw.radius, screw.radius, screw.depth, 16]} /></mesh>)}
  </>
}

/** A button in its gilt collar on a switch plate’s face, `y` above the plate’s middle. */
export function SwitchButton({material, pressed, y}: {
  material: Material
  pressed: boolean
  y: number
}) {
  return <group position={[0, y, plate[2]]}>
    <mesh material={gold} name='switch-plate-collar' position={[0, 0, collar.depth / 2]} rotation={facing}><cylinderGeometry args={[collar.radius, collar.radius, collar.depth, 32]} /></mesh>
    <mesh material={material} name='switch-plate-button' position={[0, 0, (pressed ? buttonTravel[0] : buttonTravel[1]) - buttonLength / 2]} rotation={facing}><cylinderGeometry args={[buttonRadius, buttonRadius, buttonLength, 32]} /></mesh>
  </group>
}
