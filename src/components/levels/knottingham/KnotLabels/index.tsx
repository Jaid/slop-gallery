import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, CylinderCollider} from '@react-three/rapier'
import {loadCanvasFonts} from 'canvas-textures'
import useCanvasTexture from 'canvas-textures/react'
import {useEffect, useMemo} from 'react'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {attribute, texture, uv, vec2} from 'three/tsl'
import {BoxGeometry, Color, CylinderGeometry, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, PlaneGeometry} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import loadModelIcons from '#src/lib/knots/loadModelIcons.ts'
import {knotSign, knotSignId, knotSignParts, knotSignPosition, knotSignRoundParts} from '#src/lib/knots/signs.ts'
import {signSupportMaterial} from '#src/lib/materials/SignMetalMaterial.ts'
import InstancedPropVisuals from '#src/lib/physics/InstancedPropVisuals.ts'

import {accentLineSize, accentLineY, creatorStickerHeight, creatorStickerSize, creatorStickerWidth, creatorStickerY, drawCreatorSticker, drawTitleSticker, labelAtlasColumns, labelBackground, labelFontFamily, titleStickerHeight, titleStickerSize, titleStickerWidth, titleStickerY} from './drawLabel.ts'

const stickerLift = 0.0015
const surfaceLift = stickerLift / 3
/** Two compact sticker atlases plus a vector accent stripe replace one full-panel raster atlas. */
export default function KnotLabels() {
  const isQuality = useGraphicsQuality()
  const supportMaterial = useMemo(() => signSupportMaterial(isQuality), [isQuality])
  useEffect(() => () => supportMaterial.dispose(), [supportMaterial])
  const resources = useMemo(() => {
    const title = atlasLayout(titleStickerWidth, titleStickerHeight, knotExhibition.length)
    const creator = atlasLayout(creatorStickerWidth, creatorStickerHeight, knotExhibition.length)
    const offsets = new Float32Array(knotExhibition.length * 2)
    const accents = new Float32Array(knotExhibition.length * 3)
    const accent = new Color
    for (const [index, exhibit] of knotExhibition.entries()) {
      const column = index % title.columns
      const row = Math.floor(index / title.columns)
      offsets[index * 2] = column / title.columns
      offsets[index * 2 + 1] = 1 - (row + 1) / title.rows
      accent.set(exhibit.accent)
      accents.set([accent.r, accent.g, accent.b], index * 3)
    }
    const titleGeometry = stickerGeometry(...titleStickerSize, titleStickerY, offsets)
    const creatorGeometry = stickerGeometry(...creatorStickerSize, creatorStickerY, new Float32Array(offsets))
    const accentGeometry = stickerGeometry(...accentLineSize, accentLineY, new Float32Array(offsets.length))
    accentGeometry.deleteAttribute('labelOffset')
    accentGeometry.setAttribute('accentColor', new InstancedBufferAttribute(accents, 3))
    const surfaceGeometry = new PlaneGeometry(knotSign.width, knotSign.height)
    surfaceGeometry.translate(0, 0, surfaceLift)
    surfaceGeometry.rotateX(knotSign.tilt)
    const surfaceMaterial = new MeshBasicNodeMaterial({color: labelBackground})
    surfaceMaterial.name = 'Knot nameplate surface material'
    surfaceMaterial.toneMapped = false
    surfaceMaterial.polygonOffset = true
    surfaceMaterial.polygonOffsetFactor = -1
    surfaceMaterial.polygonOffsetUnits = -1
    const surfaceMesh = new InstancedMesh(surfaceGeometry, surfaceMaterial, knotExhibition.length)
    surfaceMesh.name = 'knot-nameplate-surfaces'
    const titleMaterial = stickerMaterial('Knot title sticker material')
    const creatorMaterial = stickerMaterial('Knot creator sticker material')
    const accentMaterial = new MeshBasicNodeMaterial
    accentMaterial.name = 'Knot accent stripe material'
    accentMaterial.toneMapped = false
    accentMaterial.polygonOffset = true
    accentMaterial.polygonOffsetFactor = -2
    accentMaterial.polygonOffsetUnits = -2
    accentMaterial.colorNode = attribute('accentColor', 'vec3')
    const titleMesh = new InstancedMesh(titleGeometry, titleMaterial, knotExhibition.length)
    titleMesh.name = 'knot-title-stickers'
    const creatorMesh = new InstancedMesh(creatorGeometry, creatorMaterial, knotExhibition.length)
    creatorMesh.name = 'knot-creator-stickers'
    const accentMesh = new InstancedMesh(accentGeometry, accentMaterial, knotExhibition.length)
    accentMesh.name = 'knot-accent-stripes'
    const parts = [
      ...knotSignParts.map(({position, rotation = [0, 0, 0], size}) => new BoxGeometry(...size).applyMatrix4((new Matrix4).makeRotationFromEuler(new Euler(...rotation))).translate(...position)),
      ...knotSignRoundParts.map(({position, radius, height: partHeight}) => new CylinderGeometry(radius, radius, partHeight, 48).translate(...position)),
    ]
    const supportGeometry = mergeGeometries(parts)
    for (const part of parts) {
      part.dispose()
    }
    const supports = new InstancedMesh(supportGeometry, [], knotExhibition.length)
    supports.name = 'knot-nameplate-supports'
    supports.castShadow = true
    supports.receiveShadow = true
    const matrix = new Matrix4
    for (const [index, exhibit] of knotExhibition.entries()) {
      matrix.makeRotationY(exhibit.rotation + knotSign.inwardRotation)
      matrix.setPosition(...knotSignPosition(exhibit))
      for (const mesh of [surfaceMesh, titleMesh, creatorMesh, accentMesh, supports]) {
        mesh.setMatrixAt(index, matrix)
      }
    }
    for (const mesh of [surfaceMesh, titleMesh, creatorMesh, accentMesh, supports]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
    }
    return {
      accentGeometry,
      accentMaterial,
      accentMesh,
      creator,
      creatorGeometry,
      creatorMaterial,
      creatorMesh,
      supports,
      surfaceGeometry,
      surfaceMaterial,
      surfaceMesh,
      title,
      titleGeometry,
      titleMaterial,
      titleMesh,
      visuals: new InstancedPropVisuals([surfaceMesh, titleMesh, creatorMesh, accentMesh, supports], knotExhibition.map(exhibit => knotSignId(exhibit.id))),

    }
  }, [])
  const titleTexture = useCanvasTexture(useMemo(() => ({
    width: resources.title.columns * resources.title.width,
    height: resources.title.rows * resources.title.height,
    name: 'Knot title stickers',
    mipmaps: false,
    prepare: () => loadCanvasFonts([
      {
        font: `600 70px ${labelFontFamily}`,
        text: knotExhibition.map(exhibit => exhibit.label).join(' '),
      },
      {
        font: `600 42px ${labelFontFamily}`,
        text: knotExhibition.map(exhibit => exhibit.title).join(' '),
      },
    ]),
    draw(context: CanvasRenderingContext2D) {
      const {columns, width, height} = resources.title
      for (const [index, exhibit] of knotExhibition.entries()) {
        drawTitleSticker(context, exhibit, index % columns * width, Math.floor(index / columns) * height)
      }
    },
  }), [resources]))
  const creatorTexture = useCanvasTexture(useMemo(() => ({
    width: resources.creator.columns * resources.creator.width,
    height: resources.creator.rows * resources.creator.height,
    name: 'Knot creator stickers',
    mipmaps: false,
    prepare: async () => {
      const [icons] = await Promise.all([
        loadModelIcons(knotExhibition.map(exhibit => exhibit.modelIcon)),
        loadCanvasFonts([
          {
            font: `32px ${labelFontFamily}`,
            text: knotExhibition.map(exhibit => exhibit.modelTitle).join(' '),
          },
          {font: `24px ${labelFontFamily}`},
        ]),
      ])
      return icons
    },
    draw(context: CanvasRenderingContext2D, icons: ReadonlyMap<string, HTMLImageElement>) {
      const {columns, width, height} = resources.creator
      for (const [index, exhibit] of knotExhibition.entries()) {
        drawCreatorSticker(context, exhibit, index % columns * width, Math.floor(index / columns) * height, icons.get(exhibit.modelIcon))
      }
    },
  }), [resources]))
  useEffect(() => {
    for (const [material, atlas, layout] of [
      [resources.titleMaterial, titleTexture, resources.title],
      [resources.creatorMaterial, creatorTexture, resources.creator],
    ] as const) {
      // A ready atlas replaces the plain matching background, not its geometry.
      material.colorNode = atlas ? texture(atlas, uv().mul(vec2(1 / layout.columns, 1 / layout.rows)).add(attribute('labelOffset', 'vec2'))) : null
      material.needsUpdate = true
    }
  }, [resources, titleTexture, creatorTexture])
  useEffect(() => () => {
    resources.supports.dispose()
    resources.supports.geometry.dispose()
    for (const mesh of [resources.surfaceMesh, resources.titleMesh, resources.creatorMesh, resources.accentMesh]) {
      mesh.dispose()
    }
    for (const geometry of [resources.surfaceGeometry, resources.titleGeometry, resources.creatorGeometry, resources.accentGeometry]) {
      geometry.dispose()
    }
    for (const material of [resources.surfaceMaterial, resources.titleMaterial, resources.creatorMaterial, resources.accentMaterial]) {
      material.dispose()
    }
  }, [resources])
  useFrame(() => resources.visuals.update(id => propObjects.get(id)?.group))
  return <>
    <primitive object={resources.surfaceMesh}/>
    <primitive object={resources.titleMesh}/>
    <primitive object={resources.creatorMesh}/>
    <primitive object={resources.accentMesh}/>
    <primitive object={resources.supports}><primitive object={supportMaterial} attach="material"/></primitive>
    {knotExhibition.map(exhibit => <GrabbableProp key={exhibit.id} id={knotSignId(exhibit.id)} title={`${exhibit.title} · nameplate`} colliders={false} type="dynamic" position={knotSignPosition(exhibit)} rotation={[0, exhibit.rotation + knotSign.inwardRotation, 0]} restitution={0.1} friction={0.9} linearDamping={0.1} angularDamping={0.15}>
      {/* Raycast-only copy; visible geometry remains instanced. */}
      <InteractiveObject id={knotSignId(exhibit.id)} onActivate={() => narrate(`prop-knot-${exhibit.id}`)}>
        <mesh geometry={resources.supports.geometry} material={supportMaterial} visible={false} dispose={null}/>
      </InteractiveObject>
      {knotSignParts.map(({position, rotation, size}, index) => <CuboidCollider key={index} position={position} rotation={rotation} args={[size[0] / 2, size[1] / 2, size[2] / 2]} mass={knotSign.plateMass}/>)}
      {knotSignRoundParts.map(({position, radius, height: partHeight, mass}, index) => <CylinderCollider key={index} position={position} args={[partHeight / 2, radius]} mass={mass}/>)}
    </GrabbableProp>)}
  </>
}
function atlasLayout(width: number, height: number, count: number) {
  return {
    columns: labelAtlasColumns,
    rows: Math.max(1, Math.ceil(count / labelAtlasColumns)),
    width,
    height,
  }
}
function stickerGeometry(width: number, height: number, y: number, offsets: Float32Array) {
  const geometry = new PlaneGeometry(width, height)
  geometry.translate(0, y, stickerLift)
  geometry.rotateX(knotSign.tilt)
  geometry.setAttribute('labelOffset', new InstancedBufferAttribute(offsets, 2))
  return geometry
}
function stickerMaterial(name: string) {
  const material = new MeshBasicNodeMaterial({color: labelBackground})
  material.name = name
  material.toneMapped = false
  material.polygonOffset = true
  material.polygonOffsetFactor = -2
  material.polygonOffsetUnits = -2
  return material
}
