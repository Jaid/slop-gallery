import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, modelScale, modelViewMatrix, mx_noise_float, positionView, time, uv, vec2, vec3, vec4, wgsl, wgslFn} from 'three/tsl'

import {tubeRay} from '../../lib/atelier.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {knotCurve} from '../../lib/knotCurve.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import {wrapCell} from '../../lib/wrapCell.ts'
import data from './data.ts'

/** A deliberately asymmetric triangulation, not a generic star lattice. Coordinates are tile-local. */
const catPoints: ReadonlyArray<readonly [number, number]> = [
  [-0.29, 0.1],
  [-0.34, 0.37],
  [-0.14, 0.19],
  [0, 0.19],
  [0.14, 0.19],
  [0.34, 0.37],
  [0.29, 0.1],
  [0.32, -0.09],
  [0.22, -0.27],
  [0, -0.3],
  [-0.22, -0.27],
  [-0.32, -0.09],
  [-0.22, 0.08],
  [-0.09, 0.06],
  [0.09, 0.06],
  [0.22, 0.08],
  [0, -0.08],
  [-0.08, -0.17],
  [0.08, -0.17],
  [0, -0.18],
  [-0.25, 0.26],
  [0.25, 0.26],
  [0, 0.1],
  [-0.18, -0.08],
  [0.18, -0.08],
  [-0.028, -0.065],
  [0.028, -0.065],
]
const catEdges: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 0],
  [0, 20],
  [20, 1],
  [20, 2],
  [4, 21],
  [21, 5],
  [21, 6],
  [12, 13],
  [14, 15],
  [13, 16],
  [14, 16],
  [3, 22],
  [11, 23],
  [23, 16],
  [16, 24],
  [24, 7],
  [23, 10],
  [24, 8],
  [16, 19],
  [17, 19],
  [18, 19],
  [25, 26],
  [26, 16],
  [16, 25],
]
const pointSource = catPoints.map(([x, y]) => `vec2f(${x.toFixed(5)}, ${y.toFixed(5)})`).join(',\n')
const edgeSource = catEdges.map(([a, b]) => `vec2u(${a}u, ${b}u)`).join(',\n')
/** Compact-support stars: coverage preserves energy when their cores become subpixel. */
const star = wgsl(`
fn purr_star(p: vec2f, radius: f32, aa: f32) -> f32 {
  let r = length(p);
  let outer = radius + aa;
  let core = (1.0 - smoothstep(max(0.0, radius - aa), outer, r)) * pow(radius / outer, 2.0);
  let halo = exp(-r * r / (radius * radius * 9.0)) * 0.10;
  return core + halo;
}`)
const segment = wgsl(`
fn purr_segment(p: vec2f, a: vec2f, b: vec2f) -> vec2f {
  let ab = b - a;
  let h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.000001), 0.0, 1.0);
  return vec2f(length(p - a - ab * h), h);
}`)
/** All motion is continuous, deterministic and local to a periodic tile; no CPU animation or textures. */
const constellation = wgslFn(`
fn purr_constellation(p: vec2f, clock: f32, identity: f32, aa: f32, intimacy: f32, gaze: vec2f, facing: f32) -> vec4f {
  let rest = array<vec2f, ${catPoints.length}>(${pointSource});
  let edges = array<vec2u, ${catEdges.length}>(${edgeSource});
  let phase = identity * 6.2831853;
  let t = clock + phase;
  let breath = 1.0 + 0.022 * sin(t * 1.3);
  // Rare, staggered exhalations send the stars outward and then reassemble the face.
  let exhale = pow(0.5 + 0.5 * sin(clock * 0.52 + phase), 16.0);
  var points: array<vec2f, ${catPoints.length}>;
  for (var i = 0u; i < ${catPoints.length}u; i++) {
    let f = f32(i);
    let a = rest[i];
    let jitter = vec2f(sin(t * 1.1 + f * 2.7), cos(t * 0.9 + f * 1.9));
    let ear = smoothstep(0.12, 0.37, a.y);
    points[i] = a * breath + jitter * (0.0025 + exhale * 0.025)
      + vec2f(sin(t * 1.7 + sign(a.x)) * 0.017 * ear, 0.0);
  }
  let cyan = vec3f(0.12, 0.80, 1.0);
  let lilac = vec3f(0.65, 0.26, 1.0);
  let gold = vec3f(1.0, 0.51, 0.13);
  let pearl = vec3f(0.67, 0.92, 1.0);
  let tint = mix(cyan, lilac, 0.5 + 0.5 * sin(phase + facing * 2.8));
  var light = vec3f(0.0);
  var coverage = 0.0;
  let lineWidth = 0.00135;
  for (var i = 0u; i < ${catEdges.length}u; i++) {
    let e = edges[i];
    let a = points[e.x];
    let b = points[e.y];
    let hit = purr_segment(p, a, b);
    let line = (1.0 - smoothstep(lineWidth, lineWidth + aa, hit.x)) * min(1.0, lineWidth * 2.0 / aa);
    let f = f32(i);
    let pulsePosition = fract(clock * (0.23 + 0.04 * sin(f)) + f * 0.173 + identity);
    let packet = exp(-pow((hit.y - pulsePosition) * 16.0, 2.0));
    let awake = 0.5 + 0.5 * sin(t * 1.4 - f * 0.39);
    let outline = select(0.09 + 0.08 * intimacy, 1.0, i < 12u || i >= 29u);
    light += tint * line * (0.16 + awake * 0.15 + packet * 0.95) * outline * (1.0 - exhale * 0.6);
    // Intermediate stars make the connections feel particulate, never like neon tubing.
    let beads = pow(0.5 + 0.5 * cos(hit.y * 18.84956), 16.0);
    light += pearl * line * beads * 0.2 * intimacy * outline;
    coverage = max(coverage, line * 0.25);
  }
  for (var i = 0u; i < ${catPoints.length}u; i++) {
    let f = f32(i);
    let d = p - points[i];
    let twinkle = 0.65 + 0.35 * pow(0.5 + 0.5 * sin(t * 2.1 + f * 2.4), 3.0);
    let radius = select(0.003, 0.007, i < 12u);
    let s = purr_star(d, radius, aa);
    light += mix(tint, pearl, 0.65) * s * (1.6 + twinkle * 1.5);
    coverage = max(coverage, s);
    // Four-ray diffraction only on a few anchor stars, with bounded support.
    if (i == 1u || i == 5u || i == 9u) {
      let cross = exp(-abs(d.x * d.y) / 0.000025) * exp(-dot(d, d) / 0.0010);
      light += pearl * cross * 0.35 * twinkle;
    }
  }
  // Eyes are little amber satellites: elliptical dotted lids, slit pupils and soft synchronized blinks.
  let blinkPhase = fract(clock * 0.17 + identity * 0.73);
  let blink = 1.0 - 0.94 * exp(-pow((blinkPhase - 0.5) / 0.024, 2.0));
  for (var side = -1; side <= 1; side += 2) {
    let s = f32(side);
    let center = vec2f(s * 0.157, 0.035) + gaze * vec2f(0.014, 0.009);
    let ep = p - center;
    for (var j = 0u; j < 8u; j++) {
      let angle = f32(j) * 0.78539816;
      let eyeX = cos(angle) * 0.058;
      let eyePoint = vec2f(eyeX, sin(angle) * abs(sin(angle)) * 0.020 * blink + s * eyeX * 0.20);
      light += gold * purr_star(ep - eyePoint, 0.0040, aa) * 3.0;
    }
    let pupil = vec2f(ep.x * 2.8, ep.y / max(blink, 0.08));
    light += gold * purr_star(pupil, 0.008, aa) * 1.6 * blink;
    // Three whiskers per cheek; the distal stars trace little comet orbits.
    for (var j = 0u; j < 3u; j++) {
      let k = f32(j);
      let root = vec2f(s * 0.11, -0.13 - k * 0.018);
      let tip = vec2f(s * (0.43 + 0.012 * sin(t + k)), -0.07 - k * 0.083 + 0.012 * sin(t * 1.6 + k));
      let h = purr_segment(p, root, tip);
      let w = (1.0 - smoothstep(0.0008, 0.0008 + aa, h.x)) * min(1.0, 0.0016 / aa);
      light += mix(tint, pearl, 0.3) * w * (0.22 + pow(h.y, 4.0) * 0.5);
      light += gold * purr_star(p - tip, 0.003, aa) * 1.0;
    }
  }
  // A golden nose and a small lunar mark on the forehead keep the faces legible at gallery distance.
  light += pearl * purr_star(p - points[16], 0.006, aa) * 2.5;
  let moonP = p - vec2f(0.0, 0.183);
  let moon = (1.0 - smoothstep(0.019, 0.019 + aa, length(moonP)))
    * smoothstep(0.018 - aa, 0.018 + aa, length(moonP - vec2f(0.009, 0.004)));
  light += gold * moon * 0.8;
  // Detached elliptical orbits are intentionally broken, not circular medallion borders.
  let orbitP = p / vec2f(0.455, 0.423);
  let orbitR = length(orbitP);
  let theta = atan2(orbitP.y, orbitP.x);
  let arc = pow(0.5 + 0.5 * sin(theta * 3.0 + t * 0.3), 8.0);
  let orbit = (1.0 - smoothstep(0.001, 0.001 + aa, abs(orbitR - 1.0) * 0.42)) * min(1.0, 0.002 / aa);
  light += tint * orbit * arc * 0.25 * intimacy;
  let cometAngle = t * 0.42;
  let comet = p - vec2f(cos(cometAngle) * 0.455, sin(cometAngle) * 0.423);
  light += gold * purr_star(comet, 0.005, aa) * 2.0;
  return vec4f(light, clamp(coverage, 0.0, 1.0));
}`, [star, segment])

/** An opaque optical volume: three apparent depths inside a continuous, polished midnight shell. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.22)
    this.name = data.id
    const {p, facing, grazing, intimate, near} = viewerFrame()
    const ray = tubeRay()
    const tube = uv()
    // Each familiar is an upright lenticular apparition, anchored to a specific place on the
    // centerline. View-plane coordinates prevent the tube’s torsion from tearing a face apart.
    const cell = tube.x.mul(12).floor()
    const anchorAngle = cell.add(0.5).mul(TAU * 2 / 12)
    const anchor = knotCurve(anchorAngle)
    const anchorView = modelViewMatrix.mul(vec4(anchor, 1))
    const along = modelViewMatrix.mul(vec4(knotCurve(anchorAngle.add(0.01)).sub(anchor).normalize(), 0)).xyz
    // Fade an apparition before a foreshortened cell could clip its ears at a UV boundary.
    const room = along.xy.length().div(along.length().max(0.0001)).smoothstep(0.5, 0.82)
    const scale = modelScale.length().div(Math.sqrt(3)).max(0.0001)
    const local = positionView.xy.sub(anchorView.xy).div(scale.mul(0.31))
    const identity = cellNoiseVec3(vec3(cell.mod(12), 0, 19.7)).x
    const aa = local.fwidth().length().mul(0.52).max(0.00035)
    // Three’s native-function typings erase the WGSL return type; the function returns vec4f.
    const cat = constellation(local, time, identity, aa, intimate.mul(0.7).add(0.3), ray.mul(vec2(8, 1.3)).clamp(-1, 1), facing)
    const nebulaPosition = p.sub(vec3(ray.x, ray.y, 0).mul(0.04))
    const cloud = mx_noise_float(nebulaPosition.mul(7).add(vec3(0, time.mul(0.035), 0)))
    const veil = mx_noise_float(nebulaPosition.mul(17).add(cloud.mul(1.6)).sub(time.mul(0.018)))
    const mist = cloud.mul(0.55).add(veil.mul(0.25)).add(0.22).clamp()
    const dusk = mix(color('#27113f'), color('#064c62'), cloud.mul(0.8).add(0.5).clamp())
    // The deeper dust drifts independently behind the recognizable faces.
    const dustPeriod = vec2(196, 28)
    const dustUV = tube.sub(ray.mul(0.046)).mul(dustPeriod)
    const dustId = wrapCell(dustUV.floor(), dustPeriod)
    const random = cellNoiseVec3(vec3(dustId, 71.3))
    const dustP = dustUV.fract().sub(random.xy.mul(0.54).add(0.23))
    const dustFoot = dustUV.fwidth().length().max(0.001)
    const dustRadius = float(0.025)
    const dust = dustP.length().smoothstep(0, dustFoot.add(dustRadius)).oneMinus().pow2()
      .mul(dustRadius.div(dustFoot.add(dustRadius)).pow2())
      .mul(random.z.smoothstep(0.64, 0.85))
    const scintillation = time.mul(1.2).add(random.x.mul(40)).sin().mul(0.35).add(0.65)
    const dustTint = mix(color('#729bff'), color('#ffd0a0'), random.y)
    this.colorNode = mix(color('#02050e'), dusk.mul(0.18), mist)
    this.metalness = 0.45
    this.roughness = 0.26
    this.clearcoat = 0.38
    this.clearcoatRoughness = 0.17
    this.ior = 1.48
    // Restrained coating interference lives only at glancing angles; star colors remain readable.
    this.iridescenceNode = grazing.pow(3).mul(0.35)
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessNode = cloud.mul(80).add(320)
    this.emissiveNode = vec4(cat as Node<'vec4'>).rgb.mul(room).mul(facing.smoothstep(0.08, 0.45)).mul(near.mul(0.35).add(0.8))
      .add(dusk.mul(mist.pow2()).mul(0.28))
      .add(dustTint.mul(dust).mul(scintillation).mul(7))
      .add(mix(color('#176785'), color('#7751bd'), grazing).mul(grazing.pow(4)).mul(0.19))
  }
}
