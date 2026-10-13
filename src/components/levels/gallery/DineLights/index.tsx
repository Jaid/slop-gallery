import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {PointLight} from 'three/webgpu'

import LedPanels from '#component/LedPanels'
import {dineLedLight, dineLedSlots} from '#src/lib/gallery/dine.ts'

/** Dine’s ceiling uses Knottingham’s breakable LED panes; each pane’s light flickers and dies with it. */
export default function DineLights() {
  const lights = useDisposable(useMemo(() => {
    const created = dineLedSlots.map(slot => {
      const light = new PointLight(dineLedLight.color, dineLedLight.intensity, dineLedLight.distance, dineLedLight.decay)
      light.name = `dine-led-emission-${slot.id}`
      light.position.set(slot.position[0], slot.position[1] - dineLedLight.drop, slot.position[2])
      return light
    })
    return Object.assign(created, {dispose: () => {
      for (const light of created) {
        light.dispose()
      }
    }})
  }, []))
  const onBrightness = (brightness: Float32Array) => {
    for (const [index, light] of lights.entries()) {
      light.intensity = dineLedLight.intensity * brightness[index]
    }
  }
  return <>
    {lights.map(light => <primitive key={light.name} object={light} />)}
    <LedPanels name='dine' slots={dineLedSlots} onBrightness={onBrightness} />
  </>
}
