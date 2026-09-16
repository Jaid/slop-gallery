import type {BakeAdapter, CanvasPixels, NativeType} from './types.ts'

import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'
import * as Three from 'three/webgpu'

import {NotBakeableError} from './types.ts'

const geometryNames = ['BufferGeometry', 'BoxGeometry', 'CapsuleGeometry', 'CircleGeometry', 'ConeGeometry', 'CylinderGeometry', 'DodecahedronGeometry', 'EdgesGeometry', 'ExtrudeGeometry', 'IcosahedronGeometry', 'LatheGeometry', 'OctahedronGeometry', 'PlaneGeometry', 'PolyhedronGeometry', 'RingGeometry', 'ShapeGeometry', 'SphereGeometry', 'TetrahedronGeometry', 'TorusGeometry', 'TorusKnotGeometry', 'TubeGeometry', 'WireframeGeometry']
const textureNames = ['Texture', 'CanvasTexture', 'DataTexture']
const mathNames = ['Vector2', 'Vector3', 'Vector4', 'Euler', 'Quaternion', 'Matrix2', 'Matrix3', 'Matrix4', 'Color', 'Box2', 'Box3', 'Sphere', 'Plane', 'Line3', 'Triangle', 'Path', 'Shape', 'Curve', 'CurvePath', 'CatmullRomCurve3', 'CubicBezierCurve', 'CubicBezierCurve3', 'QuadraticBezierCurve', 'QuadraticBezierCurve3', 'LineCurve', 'LineCurve3', 'EllipseCurve', 'ArcCurve', 'SplineCurve']
const attributeNames = ['BufferAttribute', 'Int8BufferAttribute', 'Uint8BufferAttribute', 'Uint8ClampedBufferAttribute', 'Int16BufferAttribute', 'Uint16BufferAttribute', 'Int32BufferAttribute', 'Uint32BufferAttribute', 'Float16BufferAttribute', 'Float32BufferAttribute', 'InstancedBufferAttribute', 'InterleavedBuffer', 'InstancedInterleavedBuffer', 'InterleavedBufferAttribute']
const constants = ['StaticDrawUsage', 'DynamicDrawUsage', 'StreamDrawUsage', 'FloatType', 'HalfFloatType', 'UnsignedByteType', 'UnsignedShortType', 'UnsignedIntType', 'IntType', 'ByteType', 'ShortType', 'RGBAFormat', 'RGBFormat', 'RedFormat', 'RGFormat', 'SRGBColorSpace', 'LinearSRGBColorSpace', 'NoColorSpace', 'RepeatWrapping', 'MirroredRepeatWrapping', 'ClampToEdgeWrapping', 'NearestFilter', 'LinearFilter', 'LinearMipmapLinearFilter', 'LinearMipmapNearestFilter', 'NearestMipmapLinearFilter', 'NearestMipmapNearestFilter', 'UVMapping', 'EquirectangularReflectionMapping', 'CubeUVReflectionMapping', 'FrontSide', 'BackSide', 'DoubleSide']
const values = Three as unknown as Record<string, unknown>
const prototype = (name: string) => (values[name] as {prototype?: object} | undefined)?.prototype
const identity = ['id', 'uuid', 'version', '_listeners']
const nativeTypes: Array<NativeType> = [
  ...geometryNames.map(name => ({
    name,
    module: 'three/webgpu',
    prototype: prototype(name),
    allocate: 'BufferGeometry',
    omit: identity,
    resource: 'geometry',
  })),
  ...textureNames.map(name => ({
    name,
    module: 'three/webgpu',
    prototype: prototype(name),
    allocate: name === 'DataTexture' ? 'DataTexture' : 'Texture',
    omit: identity,
    resource: 'texture',
  })),
  ...mathNames.map(name => ({
    name,
    module: 'three/webgpu',
    prototype: prototype(name),
    allocate: name,
    omit: identity,
  })),
  ...attributeNames.map(name => ({
    name,
    module: 'three/webgpu',
    prototype: prototype(name),
    allocate: name.includes('Interleaved') ? (name === 'InterleavedBufferAttribute' ? name : 'InterleavedBuffer') : 'BufferAttribute',
    allocationArguments: name === 'InterleavedBufferAttribute' ? [new Three.InterleavedBuffer(new Float32Array(0), 1), 1, 0] : [new Float32Array(0), 1],
    omit: identity,
  })),
  {
    name: 'TextureSource',
    module: 'three/webgpu',
    prototype: prototype('TextureSource'),
    allocate: 'TextureSource',
    omit: identity,
  },
  {
    name: 'Source',
    module: 'three/webgpu',
    prototype: prototype('Source'),
    allocate: 'Source',
    omit: identity,
  },
].filter(type => type.prototype) as Array<NativeType>
export function threeAdapter(options: {
  kind: 'geometry' | 'texture'
  modules?: ReadonlyMap<string, Readonly<Record<string, unknown>>>
  name: string
  ownsCanvas?: (value: object) => boolean
  readCanvas?: (value: object) => CanvasPixels | undefined
  roots?: ReadonlyArray<unknown>
}): BakeAdapter {
  const available = [...geometryNames, ...textureNames, ...mathNames, ...attributeNames, ...constants, 'MeshBasicNodeMaterial']
  const native = Object.fromEntries(available.filter(name => name in values).map(name => [name, values[name]]))
  const roots = new Set([...geometryNames, ...textureNames].map(name => values[name]).filter(Boolean))
  for (const root of options.roots ?? []) {
    roots.add(root)
  }
  return {
    name: options.name,
    types: nativeTypes,
    roots,
    accepts: resources => resources.has(options.kind) && (options.kind === 'texture' || !resources.has('texture')),
    readCanvas: options.readCanvas,
    ownsCanvas: options.ownsCanvas,
    async loadModule(source) {
      if (source === 'three-bvh-csg') {
        const {ADDITION, Brush, Evaluator, SUBTRACTION} = await import('three-bvh-csg')
        return {
          ADDITION,
          Brush,
          Evaluator,
          SUBTRACTION,
        }
      }
    },
    modules: new Map([
      ['three', native],
      ['three/webgpu', native],
      ['three/addons/math/SimplexNoise.js', {SimplexNoise: SeededSimplexNoise}],
      ['three/addons/utils/BufferGeometryUtils.js', {
        mergeVertices,
        mergeGeometries,
      }],
      ...options.modules ?? [],
    ]),
  }
}

class SeededSimplexNoise extends SimplexNoise {
  constructor(random?: {random: () => number}) {
    if (!random || typeof random.random !== 'function') {
      throw new NotBakeableError('SimplexNoise needs an explicit deterministic random source.')
    }
    super(random)
  }
}
