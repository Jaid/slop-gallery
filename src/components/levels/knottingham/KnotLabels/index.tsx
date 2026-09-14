import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, CylinderCollider} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import useDisposable from 'disposable-lifetime/react'
import {useEffect, useMemo} from 'react'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {attribute, texture, uv, vec2} from 'three/tsl'
import {BoxGeometry, CylinderGeometry, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, PlaneGeometry} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import loadModelIcons from '#src/lib/knots/loadModelIcons.ts'
import {knotSign, knotSignId, knotSignParts, knotSignPosition, knotSignRoundParts} from '#src/lib/knots/signs.ts'
import {signSupportMaterial} from '#src/lib/materials/SignMetalMaterial.ts'
import InstancedPropVisuals from '#src/lib/physics/InstancedPropVisuals.ts'

import drawLabel, {labelAtlasColumns, labelBackground, labelFonts, labelHeight, labelWidth} from './drawLabel.ts'

const atlasRows = Math.ceil(knotExhibition.length / labelAtlasColumns)
/** One complete face atlas and two instanced batches: faces and physical supports. */
export default function KnotLabels() {
  const isQuality = useGraphicsQuality()
  const supportMaterial = useDisposable(useMemo(() => signSupportMaterial(isQuality), [isQuality]))
  const resources = useDisposable(useMemo(() => {
    const offsets = new Float32Array(knotExhibition.length * 2)
    for (let index = 0; index < knotExhibition.length; index++) {
      offsets[index * 2] = index % labelAtlasColumns / labelAtlasColumns
      offsets[index * 2 + 1] = 1 - (Math.floor(index / labelAtlasColumns) + 1) / atlasRows
    }
    const geometry = new PlaneGeometry(knotSign.width, knotSign.height)
    // Separate the only face from its metal backing, not from other face layers.
    geometry.translate(0, 0, 0.0005)
    geometry.rotateX(knotSign.tilt)
    geometry.setAttribute('labelOffset', new InstancedBufferAttribute(offsets, 2))
    const material = new MeshBasicNodeMaterial({color: labelBackground})
    material.name = 'Knot nameplate material'
    material.toneMapped = false
    material.polygonOffset = true
    material.polygonOffsetFactor = -1
    material.polygonOffsetUnits = -1
    const faces = new InstancedMesh(geometry, material, knotExhibition.length)
    faces.name = 'knot-nameplates'
    const parts = [
      ...knotSignParts.map(({position, rotation = [0, 0, 0], size}) => new BoxGeometry(...size).applyMatrix4((new Matrix4).makeRotationFromEuler(new Euler(...rotation))).translate(...position)),
      ...knotSignRoundParts.map(({position, rotation = [0, 0, 0], radius, height: partHeight}) => new CylinderGeometry(radius, radius, partHeight, 48).applyMatrix4((new Matrix4).makeRotationFromEuler(new Euler(...rotation))).translate(...position)),
    ]
    const supportGeometry = mergeGeometries(parts)
    for (const part of parts) {
      part.dispose()
    }
    const supports = new InstancedMesh(supportGeometry, [], knotExhibition.length)
    supports.name = 'knot-nameplate-supports'
    supports.castShadow = true
    supports.receiveShadow = true
    const meshes = [faces, supports]
    const matrix = new Matrix4
    for (const [index, exhibit] of knotExhibition.entries()) {
      matrix.makeRotationY(exhibit.rotation + knotSign.inwardRotation)
      matrix.setPosition(...knotSignPosition(exhibit))
      for (const mesh of meshes) {
        mesh.setMatrixAt(index, matrix)
      }
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
    }
    return {
      faces,
      supports,
      visuals: new InstancedPropVisuals(meshes, knotExhibition.map(exhibit => knotSignId(exhibit.id))),
      dispose() {
        for (const mesh of meshes) {
          mesh.dispose()
          mesh.geometry.dispose()
        }
        material.dispose()
      },
    }
  }, []))
  const atlas = useCanvasTexture(useMemo(() => ({
    width: labelAtlasColumns * labelWidth,
    height: atlasRows * labelHeight,
    name: 'Knot nameplate atlas',
    mipmaps: false,
    prepare: async () => {
      const [icons] = await Promise.all([
        loadModelIcons(knotExhibition.map(exhibit => exhibit.modelIcon)),
        loadCanvasFonts([
          {
            font: labelFonts.number,
            text: knotExhibition.map(exhibit => exhibit.label).join(' '),
          },
          {
            font: labelFonts.title,
            text: knotExhibition.map(exhibit => exhibit.title).join(' '),
          },
          {
            font: labelFonts.model,
            text: knotExhibition.map(exhibit => exhibit.modelTitle).join(' '),
          },
          {font: labelFonts.detail},
        ]),
      ])
      return icons
    },
    draw(context: CanvasRenderingContext2D, icons: ReadonlyMap<string, HTMLImageElement>) {
      for (const [index, exhibit] of knotExhibition.entries()) {
        drawLabel(context, exhibit, index % labelAtlasColumns * labelWidth, Math.floor(index / labelAtlasColumns) * labelHeight, icons.get(exhibit.modelIcon))
      }
    },
  }), []))
  useEffect(() => {
    // Invalidate the placeholder shader when the prepared atlas arrives.
    const {material} = resources.faces
    material.colorNode = atlas ? texture(atlas, uv().mul(vec2(1 / labelAtlasColumns, 1 / atlasRows)).add(attribute('labelOffset', 'vec2'))) : null
    material.needsUpdate = true
  }, [resources, atlas])
  useFrame(() => resources.visuals.update(id => propObjects.get(id)?.group))
  return <>
    <primitive object={resources.faces}/>
    <primitive object={resources.supports}><primitive object={supportMaterial} attach="material"/></primitive>
    {knotExhibition.map(exhibit => <GrabbableProp key={exhibit.id} id={knotSignId(exhibit.id)} title={`${exhibit.title} · nameplate`} colliders={false} type="dynamic" position={knotSignPosition(exhibit)} rotation={[0, exhibit.rotation + knotSign.inwardRotation, 0]} restitution={0.1} friction={0.9} linearDamping={0.1} angularDamping={0.15}>
      {/* Raycast-only copy; visible geometry remains instanced. */}
      <InteractiveObject id={knotSignId(exhibit.id)} onActivate={() => narrate(`prop-knot-${exhibit.id}`)}>
        <mesh geometry={resources.supports.geometry} material={supportMaterial} visible={false} dispose={null}/>
      </InteractiveObject>
      {knotSignParts.map(({position, rotation, size}, index) => <CuboidCollider key={index} position={position} rotation={rotation} args={[size[0] / 2, size[1] / 2, size[2] / 2]} mass={knotSign.plateMass}/>)}
      {knotSignRoundParts.map(({position, rotation, radius, height: partHeight, mass}, index) => <CylinderCollider key={index} position={position} rotation={rotation} args={[partHeight / 2, radius]} mass={mass}/>)}
    </GrabbableProp>)}
  </>
}
