import type {ThreeElements} from '@react-three/fiber'
import type {Material} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import InteractiveObject from '#component/InteractiveObject'
import {playEffect} from '#src/lib/gallery.ts'
import lightSwitch from '#src/lib/gallery/lightSwitch.ts'
import gold from '#src/lib/materials/gold.ts'

const {buttonOffset, buttonRadius, buttonTravel, collar, plate, plateRadius, screw} = lightSwitch
/** long enough to reach from inside the plate to a popped-out button’s face */
const buttonLength = plate[2] + buttonTravel[1]
/** turns a cylinder’s axis from up to out of the wall */
const facing = [Math.PI / 2, 0, 0] as const

/**
 * An old push-button light switch, the back of its plate on the wall at its origin: E presses the button that stands out, which pops the other one out.
 * It only shows whether its lights are on; the owner switches them.
 */
export default function LightSwitch({id, on, onToggle, title = 'Light switch', ...props}: Omit<ThreeElements['group'], 'id' | 'ref'> & {
  /** its id as an interactive object */
  id: string
  /** whether its lights are on, which keeps the upper button pushed in and the lower one out */
  on: boolean
  onToggle: () => void
  /** short display name for the interaction hint */
  title?: string
}) {
  const plateGeometry = useDisposable(useMemo(() => new RoundedBoxGeometry(...plate, 2, plateRadius), []))
  const pearl = useDisposable(useMemo(() => new MeshPhysicalNodeMaterial({
    color: '#eee6d6',
    roughness: 0.2,
    iridescence: 0.7,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [180, 520],
  }), []))
  const ebony = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#16110d',
    roughness: 0.3,
  }), []))
  const press = () => {
    playEffect('SFX-44')
    onToggle()
  }
  return <InteractiveObject id={id} action={on ? 'Switch off' : 'Switch on'} title={title} onActivate={press} {...props}>
    <mesh material={gold} name='light-switch-plate' position={[0, 0, plate[2] / 2]} receiveShadow><primitive attach='geometry' object={plateGeometry} /></mesh>
    {[screw.offset, -screw.offset].map(y => <mesh key={y} material={gold} name='light-switch-screw' position={[0, y, plate[2] + screw.depth / 2]} rotation={facing}><cylinderGeometry args={[screw.radius, screw.radius, screw.depth, 16]} /></mesh>)}
    <Button material={pearl} pressed={on} y={buttonOffset} />
    <Button material={ebony} pressed={!on} y={-buttonOffset} />
  </InteractiveObject>
}

/** A button in its gilt collar on the plate’s face, `y` above the plate’s middle. */
function Button({material, pressed, y}: {
  material: Material
  pressed: boolean
  y: number
}) {
  return <group position={[0, y, plate[2]]}>
    <mesh material={gold} name='light-switch-collar' position={[0, 0, collar.depth / 2]} rotation={facing}><cylinderGeometry args={[collar.radius, collar.radius, collar.depth, 32]} /></mesh>
    <mesh material={material} name='light-switch-button' position={[0, 0, (pressed ? buttonTravel[0] : buttonTravel[1]) - buttonLength / 2]} rotation={facing}><cylinderGeometry args={[buttonRadius, buttonRadius, buttonLength, 32]} /></mesh>
  </group>
}
