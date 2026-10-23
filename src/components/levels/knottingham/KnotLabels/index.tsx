import type {Texture} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {CuboidCollider, CylinderCollider} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import useDisposable from 'disposable-lifetime/react'
import {knotExhibition, knotRarityMode} from 'knot-materials/exhibition.ts'
import loadCandidateIcons from 'knot-materials/loadCandidateIcons.ts'
import {knotSign, knotSignId, knotSignParts, knotSignPosition, knotSignRoundParts} from 'knot-materials/signs.ts'
import {useEffect, useMemo, useSyncExternalStore} from 'react'
import {attribute, texture, uv, vec2} from 'three/tsl'
import {InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, PlaneGeometry} from 'three/webgpu'
import useGraphicsMode, {useGraphicsModeValue} from 'use-graphics-mode'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {activateKnotSign, knotRarityEditor} from '#src/levels/knottingham/rarity.ts'
import metal from '#src/lib/materials/metal.ts'
import InstancedPropVisuals from '#src/lib/physics/InstancedPropVisuals.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

import drawLabel, {labelAtlasColumns, labelBackground, labelFonts, labelHeight, labelWidth, updateRarityAtlas} from './drawLabel.ts'
import createSupportGeometry from './supportGeometry.ts'

const atlasRows = Math.ceil(knotExhibition.length / labelAtlasColumns)
/** One complete face atlas and two instanced batches: faces and physical supports. */
export default function KnotLabels() {
  const isHeavy = useGraphicsMode()
  const {canvasTextureMipmaps: mipmaps, canvasTextureResolution: resolution} = useGraphicsModeValue(getGraphicsProfile)
  const ratings = useSyncExternalStore(knotRarityEditor.subscribe, knotRarityEditor.getSnapshot, knotRarityEditor.getSnapshot)
  // Only the flat fallback is owned here; the reflective steel is shared for the page lifetime.
  const flatSupportMaterial = useDisposable(useMemo(() => new MeshBasicNodeMaterial({color: '#9ca6ad'}), []))
  const supportMaterial = isHeavy ? metal : flatSupportMaterial
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
    const supports = new InstancedMesh(createSupportGeometry(), [], knotExhibition.length)
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
      setAtlas(atlas: Texture | null) {
        material.colorNode = atlas ? texture(atlas, uv().mul(vec2(1 / labelAtlasColumns, 1 / atlasRows)).add(attribute('labelOffset', 'vec2'))) : null
        material.needsUpdate = true
      },
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
    resolution,
    name: 'Knot nameplate atlas',
    mipmaps,
    prepare: async () => {
      const [icons] = await Promise.all([
        loadCandidateIcons(knotExhibition.map(exhibit => exhibit.candidate.icon)),
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
          {
            font: labelFonts.rarity,
            text: '★',
          },
        ]),
      ])
      return icons
    },
    draw(context: CanvasRenderingContext2D, icons: ReadonlyMap<string, HTMLImageElement>) {
      for (const [index, exhibit] of knotExhibition.entries()) {
        drawLabel(context, exhibit, index % labelAtlasColumns * labelWidth, Math.floor(index / labelAtlasColumns) * labelHeight, icons.get(exhibit.candidate.icon))
      }
    },
  }), [mipmaps, resolution]))
  useEffect(() => {
    resources.setAtlas(atlas)
  }, [resources, atlas])
  useEffect(() => {
    if (!atlas) {
      return
    }
    updateRarityAtlas(atlas, knotExhibition, ratings)
  }, [atlas, ratings])
  useFrame(() => resources.visuals.update(id => propObjects.get(id)?.group))
  return <>
    <primitive object={resources.faces} />
    <primitive object={resources.supports}><primitive attach='material' object={supportMaterial} /></primitive>
    {knotExhibition.map(exhibit => <GrabbableProp key={exhibit.id} id={knotSignId(exhibit.id)} angularDamping={0.15} colliders={false} friction={0.9} linearDamping={0.1} position={knotSignPosition(exhibit)} restitution={0.1} rotation={[0, exhibit.rotation + knotSign.inwardRotation, 0]} title={`${exhibit.title} · nameplate`} type='dynamic'>
      {/* Raycast-only copy; visible geometry remains instanced. */}
      <InteractiveObject id={knotSignId(exhibit.id)} action={knotRarityMode === 'edit' ? 'Rate' : 'Listen'} title={`${exhibit.title} nameplate`} onActivate={() => activateKnotSign(exhibit)}>
        <mesh dispose={null} geometry={resources.supports.geometry} material={supportMaterial} visible={false} />
      </InteractiveObject>
      {knotSignParts.map(({position, rotation, size}, index) => <CuboidCollider key={index} args={[size[0] / 2, size[1] / 2, size[2] / 2]} mass={knotSign.plateMass} position={position} rotation={rotation} />)}
      {knotSignRoundParts.map(({position, rotation, radius, height: partHeight, mass}, index) => <CylinderCollider key={index} args={[partHeight / 2, radius]} mass={mass} position={position} rotation={rotation} />)}
    </GrabbableProp>)}
  </>
}
