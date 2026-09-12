import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {attribute, texture, uv, vec2} from 'three/tsl'
import {BoxGeometry, DataTexture, InstancedBufferAttribute, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Matrix4, MeshBasicNodeMaterial, MeshStandardNodeMaterial, PlaneGeometry, RGBAFormat, SRGBColorSpace} from 'three/webgpu'

import {knotExhibition} from '#src/lib/knots/exhibition.ts'
import {knotSign, knotSignParts, knotSignPosition} from '#src/lib/knots/signs.ts'

import drawLabel, {labelHeight as height, labelFontFamily, labelWidth as width} from './drawLabel.ts'
import loadModelIcons from './modelIcons.ts'

/** One atlas and one instanced draw replace hundreds of label meshes/materials. */
export default function KnotLabels() {
  const resources = useMemo(() => {
    const columns = 8
    const rows = Math.ceil(knotExhibition.length / columns)
    const canvas = document.createElement('canvas')
    canvas.width = columns * width
    canvas.height = rows * height
    const context = canvas.getContext('2d')!
    context.fillStyle = '#122029'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const offsets = new Float32Array(knotExhibition.length * 2)
    for (const [index, exhibit] of knotExhibition.entries()) {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = column * width
      const y = row * height
      offsets[index * 2] = column / columns
      offsets[index * 2 + 1] = 1 - (row + 1) / rows
      drawLabel(context, exhibit, x, y)
    }
    const atlas = new DataTexture(new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer), canvas.width, canvas.height, RGBAFormat)
    atlas.name = 'Knot challenge label atlas'
    atlas.flipY = true
    atlas.colorSpace = SRGBColorSpace
    atlas.generateMipmaps = true
    atlas.minFilter = LinearMipmapLinearFilter
    atlas.magFilter = LinearFilter
    atlas.anisotropy = 8
    atlas.needsUpdate = true
    const geometry = new PlaneGeometry(knotSign.width, knotSign.height)
    geometry.setAttribute('labelOffset', new InstancedBufferAttribute(offsets, 2))
    const material = new MeshBasicNodeMaterial
    material.name = 'Knot challenge labels'
    material.toneMapped = false
    material.colorNode = texture(atlas, uv().mul(vec2(1 / columns, 1 / rows)).add(attribute('labelOffset', 'vec2')))
    const mesh = new InstancedMesh(geometry, material, knotExhibition.length)
    mesh.name = 'knot-nameplates'
    const parts = knotSignParts.map(({position, size}) => new BoxGeometry(...size).translate(...position))
    const supportGeometry = mergeGeometries(parts)
    for (const part of parts) {
      part.dispose()
    }
    const supportMaterial = new MeshStandardNodeMaterial({
      color: '#9ca6ad',
      metalness: 0.9,
      roughness: 0.32,
    })
    const supports = new InstancedMesh(supportGeometry, supportMaterial, knotExhibition.length)
    supports.name = 'knot-nameplate-supports'
    supports.castShadow = true
    supports.receiveShadow = true
    const matrix = new Matrix4
    for (const [index, exhibit] of knotExhibition.entries()) {
      matrix.makeRotationY(exhibit.rotation)
      matrix.setPosition(...knotSignPosition(exhibit))
      supports.setMatrixAt(index, matrix)
      matrix.elements[12] += Math.sin(exhibit.rotation) * 0.001
      matrix.elements[14] += Math.cos(exhibit.rotation) * 0.001
      mesh.setMatrixAt(index, matrix)
    }
    supports.instanceMatrix.needsUpdate = true
    supports.computeBoundingBox()
    supports.computeBoundingSphere()
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    return {
      atlas,
      supports,
      updateIcons(icons: ReadonlyMap<string, HTMLImageElement>) {
        for (const [index, exhibit] of knotExhibition.entries()) {
          const url = exhibit.modelIcon
          drawLabel(context, exhibit, index % columns * width, Math.floor(index / columns) * height, url ? icons.get(url) : undefined)
        }
        atlas.image.data!.set(context.getImageData(0, 0, canvas.width, canvas.height).data)
        atlas.needsUpdate = true
      },
      geometry,
      material,
      mesh,
    }
  }, [])
  useEffect(() => {
    let active = true
    void Promise.all([
      loadModelIcons(knotExhibition.map(exhibit => exhibit.modelIcon)),
      document.fonts.load(`600 84px ${labelFontFamily}`),
      document.fonts.load(`44px ${labelFontFamily}`),
    ]).then(([icons]) => {
      if (active) {
        resources.updateIcons(icons)
      }
    }).catch(error => {
      console.warn('Knot label atlas could not be updated.', error)
    })
    return () => {
      active = false
    }
  }, [resources])
  useEffect(() => () => {
    resources.supports.dispose()
    resources.supports.geometry.dispose()
    resources.supports.material.dispose()
    resources.mesh.dispose()
    resources.geometry.dispose()
    resources.material.dispose()
    resources.atlas.dispose()
  }, [resources])
  return <>
    <primitive object={resources.mesh}/>
    <primitive object={resources.supports}/>
    <RigidBody name="knot-nameplate-colliders" type="fixed" colliders={false}>
      {knotExhibition.map(exhibit => <group key={exhibit.id} position={knotSignPosition(exhibit)} rotation={[0, exhibit.rotation, 0]}>
        {knotSignParts.map(({position, size}, index) => <CuboidCollider key={index} position={position} args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>)}
      </group>)}
    </RigidBody>
  </>
}
