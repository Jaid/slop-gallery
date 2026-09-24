import type {Material} from 'three/webgpu'

import {CuboidCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {knotBillboardPhysics} from 'knot-materials/knotBillboardPhysics.ts'
import {knotPreviewHeight, knotPreviewPanelOffsetY, knotPreviewWidth} from 'knot-materials/KnotPreviewLayout.ts'
import {mergeParts} from 'knot-materials/mergeParts.ts'
import {billboardParts} from 'knot-materials/signs.ts'
import {useMemo} from 'react'
import {BoxGeometry} from 'three/webgpu'

import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'

const [panelPart, ...standParts] = billboardParts(knotPreviewWidth, knotPreviewHeight, knotPreviewPanelOffsetY)
export default function Stand() {
  const geometry = useDisposable(useMemo(() => mergeParts(standParts.map(({position, rotation = [0, 0, 0], size}) => {
    const partGeometry = new BoxGeometry(...size)
    partGeometry.rotateX(rotation[0])
    partGeometry.rotateY(rotation[1])
    partGeometry.rotateZ(rotation[2])
    partGeometry.translate(...position)
    return partGeometry
  })), []))
  const material = useDisposable(useMemo(() => new LodgeWoodMaterial, []))
  return <>
    <mesh castShadow geometry={geometry} material={material} name='billboard-stand-mesh' receiveShadow />
    {standParts.map(({position, rotation, size}, index) => <CuboidCollider key={index} args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={knotBillboardPhysics.stand.friction} mass={knotBillboardPhysics.stand.colliderMass} position={position} rotation={rotation} />)}
  </>
}

export function Sign({face}: {face: Material}) {
  const geometry = useDisposable(useMemo(() => new BoxGeometry(...panelPart.size), []))
  const wood = useDisposable(useMemo(() => new LodgeWoodMaterial, []))
  const position = [0, 0, panelPart.position[2]] as const
  return <>
    <mesh castShadow geometry={geometry} material={[wood, wood, wood, wood, face, wood]} name='billboard-sign-mesh' position={position} receiveShadow />
    <CuboidCollider args={[panelPart.size[0] / 2, panelPart.size[1] / 2, panelPart.size[2] / 2]} mass={knotBillboardPhysics.sign.mass} position={position} />
  </>
}
