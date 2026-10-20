import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {PointLight} from 'three/webgpu'

import LedPanels from '#component/LedPanels'

/** Knottingham’s breakable LED panes on a room’s ceiling; each pane’s light flickers and dies with it. */
export default function CeilingLeds({light, name, slots}: {
  light: {
    color: string
    decay: number
    distance: number
    /** distance below the pane’s origin */
    drop: number
    intensity: number
  }
  name: string
  slots: ReadonlyArray<KnotLightSlot>
}) {
  const lights = useDisposable(useMemo(() => {
    const created = slots.map(slot => {
      const emission = new PointLight(light.color, light.intensity, light.distance, light.decay)
      emission.name = `${name}-led-emission-${slot.id}`
      emission.position.set(slot.position[0], slot.position[1] - light.drop, slot.position[2])
      return emission
    })
    return Object.assign(created, {dispose: () => {
      for (const emission of created) {
        emission.dispose()
      }
    }})
  }, [light, name, slots]))
  const onBrightness = (brightness: Float32Array) => {
    for (const [index, emission] of lights.entries()) {
      emission.intensity = light.intensity * brightness[index]
    }
  }
  return <>
    {lights.map(emission => <primitive key={emission.name} object={emission} />)}
    <LedPanels name={name} slots={slots} onBrightness={onBrightness} />
  </>
}
