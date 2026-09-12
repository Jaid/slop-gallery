import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, CylinderCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {attribute, texture, uv, vec2} from 'three/tsl'
import {BoxGeometry, Color, CylinderGeometry, DataTexture, Euler, InstancedBufferAttribute, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Matrix4, MeshBasicNodeMaterial, PlaneGeometry, RGBAFormat, SRGBColorSpace} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import InteractiveObject from '#component/InteractiveObject'
import GrabbableProp, {propObjects} from '#src/components/Scene/GrabbableProp.tsx'
import {narrate} from '#src/lib/gallery/actions.ts'
import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import loadModelIcons from '#src/lib/knots/loadModelIcons.ts'
import {knotSign, knotSignId, knotSignParts, knotSignPosition, knotSignRoundParts} from '#src/lib/knots/signs.ts'
import {signSupportMaterial} from '#src/lib/materials/SignMetalMaterial.ts'
import InstancedPropVisuals from '#src/lib/physics/InstancedPropVisuals.ts'

import {accentLineSize, accentLineY, creatorStickerHeight, creatorStickerSize, creatorStickerWidth, creatorStickerY, drawCreatorSticker, drawTitleSticker, labelAtlasColumns, labelFontFamily, titleStickerHeight, titleStickerSize, titleStickerWidth, titleStickerY} from './drawLabel.ts'

const stickerLift = 0.0015
/** Two compact sticker atlases plus a vector accent stripe replace one full-panel raster atlas. */
export default function KnotLabels() {
  const isQuality = useGraphicsQuality()
  const supportMaterial = useMemo(() => signSupportMaterial(isQuality), [isQuality])
  useEffect(() => () => supportMaterial.dispose(), [supportMaterial])
  const resources = useMemo(() => {
    const title = createAtlas(titleStickerWidth, titleStickerHeight, knotExhibition.length, 'Knot title stickers')
    const creator = createAtlas(creatorStickerWidth, creatorStickerHeight, knotExhibition.length, 'Knot creator stickers')
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
      drawTitleSticker(title.context, exhibit, column * title.width, row * title.height)
      drawCreatorSticker(creator.context, exhibit, column * creator.width, row * creator.height)
    }
    const upload = (resource: ReturnType<typeof createAtlas>) => {
      resource.atlas.image.data!.set(resource.context.getImageData(0, 0, resource.canvas.width, resource.canvas.height).data)
      resource.atlas.needsUpdate = true
    }
    upload(title)
    upload(creator)
    const titleGeometry = stickerGeometry(...titleStickerSize, titleStickerY, offsets)
    const creatorGeometry = stickerGeometry(...creatorStickerSize, creatorStickerY, new Float32Array(offsets))
    const accentGeometry = stickerGeometry(...accentLineSize, accentLineY, new Float32Array(offsets.length))
    accentGeometry.deleteAttribute('labelOffset')
    accentGeometry.setAttribute('accentColor', new InstancedBufferAttribute(accents, 3))
    const titleMaterial = stickerMaterial(title.atlas, title.columns, title.rows, 'Knot title sticker material')
    const creatorMaterial = stickerMaterial(creator.atlas, creator.columns, creator.rows, 'Knot creator sticker material')
    const accentMaterial = new MeshBasicNodeMaterial
    accentMaterial.name = 'Knot accent stripe material'
    accentMaterial.toneMapped = false
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
      for (const mesh of [titleMesh, creatorMesh, accentMesh, supports]) {
        mesh.setMatrixAt(index, matrix)
      }
    }
    for (const mesh of [titleMesh, creatorMesh, accentMesh, supports]) {
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
      title,
      titleGeometry,
      titleMaterial,
      titleMesh,
      visuals: new InstancedPropVisuals([titleMesh, creatorMesh, accentMesh, supports], knotExhibition.map(exhibit => knotSignId(exhibit.id))),
      updateStickers(icons: ReadonlyMap<string, HTMLImageElement>) {
        for (const [index, exhibit] of knotExhibition.entries()) {
          const column = index % title.columns
          const row = Math.floor(index / title.columns)
          drawTitleSticker(title.context, exhibit, column * title.width, row * title.height)
          const url = exhibit.modelIcon
          drawCreatorSticker(creator.context, exhibit, column * creator.width, row * creator.height, url ? icons.get(url) : undefined)
        }
        upload(title)
        upload(creator)
      },
    }
  }, [])
  useEffect(() => {
    let active = true
    void Promise.all([
      loadModelIcons(knotExhibition.map(exhibit => exhibit.modelIcon)),
      document.fonts.load(`600 70px ${labelFontFamily}`),
      document.fonts.load(`600 42px ${labelFontFamily}`),
      document.fonts.load(`32px ${labelFontFamily}`),
      document.fonts.load(`24px ${labelFontFamily}`),
    ]).then(([icons]) => {
      if (active) {
        resources.updateStickers(icons)
      }
    }).catch(error => {
      console.warn('Knot sticker atlases could not be updated.', error)
    })
    return () => {
      active = false
    }
  }, [resources])
  useEffect(() => () => {
    resources.supports.dispose()
    resources.supports.geometry.dispose()
    for (const mesh of [resources.titleMesh, resources.creatorMesh, resources.accentMesh]) {
      mesh.dispose()
    }
    for (const geometry of [resources.titleGeometry, resources.creatorGeometry, resources.accentGeometry]) {
      geometry.dispose()
    }
    for (const material of [resources.titleMaterial, resources.creatorMaterial, resources.accentMaterial]) {
      material.dispose()
    }
    resources.title.atlas.dispose()
    resources.creator.atlas.dispose()
  }, [resources])
  useFrame(() => resources.visuals.update(id => propObjects.get(id)?.group))
  return <>
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
function createAtlas(width: number, height: number, count: number, name: string) {
  const columns = labelAtlasColumns
  const rows = Math.ceil(count / columns)
  const canvas = document.createElement('canvas')
  canvas.width = columns * width
  canvas.height = rows * height
  const context = canvas.getContext('2d')!
  const atlas = new DataTexture(new Uint8Array(canvas.width * canvas.height * 4), canvas.width, canvas.height, RGBAFormat)
  atlas.name = name
  atlas.flipY = true
  atlas.colorSpace = SRGBColorSpace
  atlas.generateMipmaps = true
  atlas.minFilter = LinearMipmapLinearFilter
  atlas.magFilter = LinearFilter
  atlas.anisotropy = 8
  return {
    atlas,
    canvas,
    columns,
    context,
    height,
    rows,
    width,
  }
}
function stickerGeometry(width: number, height: number, y: number, offsets: Float32Array) {
  const geometry = new PlaneGeometry(width, height)
  geometry.translate(0, y, stickerLift)
  geometry.rotateX(knotSign.tilt)
  geometry.setAttribute('labelOffset', new InstancedBufferAttribute(offsets, 2))
  return geometry
}
function stickerMaterial(atlas: DataTexture, columns: number, rows: number, name: string) {
  const material = new MeshBasicNodeMaterial
  material.name = name
  material.toneMapped = false
  material.colorNode = texture(atlas, uv().mul(vec2(1 / columns, 1 / rows)).add(attribute('labelOffset', 'vec2')))
  return material
}
