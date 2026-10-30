import type {ThreeElements} from '@react-three/fiber'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import InteractiveObject from '#component/InteractiveObject'
import SwitchPlate, {SwitchButton} from '#component/SwitchPlate'
import {playEffect} from '#src/lib/gallery.ts'
import lightSwitch, {switchButtonY} from '#src/lib/gallery/lightSwitch.ts'

/** one of the buttons of a {@link SelectorSwitch} */
export type SelectorOption = {
  /** the color of its enameled button as #rrggbb */
  button: string
  /** short display name for the interaction hint */
  title: string
}

const {buttonSpacing, plate} = lightSwitch

/**
 * An old push-button switch with a column of enameled buttons of which one at a time is pushed in, the back of its plate on the wall at its origin: E presses the aimed button, which pops the pressed one out.
 * Each button takes the band of the plate around it, so the whole plate can be aimed at. It only shows the chosen option; the owner applies it.
 */
export default function SelectorSwitch<Option extends string>({id, onChange, options, value, ...props}: Omit<ThreeElements['group'], 'id' | 'onChange' | 'ref'> & {
  /** prefixes the ids of its buttons as interactive objects */
  id: string
  onChange: (value: Option) => void
  /** its buttons by their options, from top to bottom */
  options: Readonly<Record<Option, SelectorOption>>
  /** the option whose button is pushed in */
  value: Option
}) {
  const buttons = Object.entries(options) as Array<[Option, SelectorOption]>
  const choose = (option: Option) => {
    if (option !== value) {
      playEffect('SFX-44')
      onChange(option)
    }
  }
  return <group {...props}>
    <SwitchPlate />
    {buttons.map(([option, {button, title}], index) => {
      const y = switchButtonY(index, buttons.length)
      return <SelectorButton key={option} id={`${id}-${option}`} bottom={index === buttons.length - 1 ? -plate[1] / 2 : y - buttonSpacing / 2} color={button} pressed={option === value} title={title} top={index === 0 ? plate[1] / 2 : y + buttonSpacing / 2} y={y} onPress={() => choose(option)} />
    })}
  </group>
}

/** A button of a {@link SelectorSwitch} at `y` on the plate, aimed at anywhere on the plate’s band from `bottom` to `top`. */
function SelectorButton({bottom, color, id, onPress, pressed, title, top, y}: {
  bottom: number
  color: string
  id: string
  onPress: () => void
  pressed: boolean
  title: string
  top: number
  y: number
}) {
  const enamel = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color,
    roughness: 0.22,
  }), [color]))
  return <InteractiveObject id={id} action='Choose' title={title} onActivate={onPress}>
    <SwitchButton material={enamel} pressed={pressed} y={y} />
    {/* An invisible target over the band, just in front of the plate and behind the button. */}
    <mesh name='switch-plate-band' position={[0, (bottom + top) / 2, plate[2] + 0.0002]}>
      <planeGeometry args={[plate[0], top - bottom]} />
      <meshBasicNodeMaterial visible={false} />
    </mesh>
  </InteractiveObject>
}
