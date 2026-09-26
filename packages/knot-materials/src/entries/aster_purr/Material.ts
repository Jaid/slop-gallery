import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec2, vec3, wgslFn} from 'three/tsl'

import {tubeRay} from '../../lib/atelier.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import data from './data.ts'

/** Integer repetition counts preserve both torus UV seams. */
const constellationPeriod = [14, 2] as const
/** A deliberately sparse feline asterism, not a filled icon. Coordinates stay inside one periodic cell. */
const stars: ReadonlyArray<readonly [number, number]> = [
  [0, -0.32],
  [-0.22, -0.22],
  [-0.32, -0.04],
  [-0.32, 0.2],
  [-0.3, 0.43],
  [-0.1, 0.19],
  [0, 0.23],
  [0.1, 0.19],
  [0.3, 0.43],
  [0.32, 0.2],
  [0.32, -0.04],
  [0.22, -0.22],
  [-0.2, 0.08],
  [-0.13, 0.12],
  [-0.06, 0.07],
  [-0.13, 0.03],
  [0.06, 0.07],
  [0.13, 0.12],
  [0.2, 0.08],
  [0.13, 0.03],
  [0, -0.06],
  [0, -0.14],
  [-0.09, -0.18],
  [0.09, -0.18],
  [-0.22, -0.09],
  [-0.44, -0.04],
  [-0.45, -0.14],
  [-0.39, -0.23],
  [0.22, -0.09],
  [0.44, -0.04],
  [0.45, -0.14],
  [0.39, -0.23],
  [-0.25, 0.28],
  [0.25, 0.28],
  [0, 0.17],
  [-0.13, 0.075],
  [0.13, 0.075],
]
const links: ReadonlyArray<readonly [number, number]> = [
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
  [3, 32],
  [32, 4],
  [32, 5],
  [7, 33],
  [33, 8],
  [33, 9],
  [12, 13],
  [13, 14],
  [14, 15],
  [15, 12],
  [16, 17],
  [17, 18],
  [18, 19],
  [19, 16],
  [14, 20],
  [16, 20],
  [20, 21],
  [21, 22],
  [21, 23],
  [22, 0],
  [23, 0],
  [24, 25],
  [24, 26],
  [24, 27],
  [28, 29],
  [28, 30],
  [28, 31],
  [2, 12],
  [10, 18],
  [6, 34],
  [34, 13],
  [34, 17],
  [1, 24],
  [11, 28],
]
const [columns, rows] = constellationPeriod
const dustPeriod = `vec2f(${(columns * 11).toFixed(1)}, ${(rows * 11).toFixed(1)})`
// Fixed-size GPU loops keep the graph compact. The CPU topology also supports invariant tests.
const constellation = wgslFn(`
fn asterPurr(q: vec2f, ray: vec2f, seconds: f32, proximity: f32, facing: f32) -> vec3f {
  let cell = floor(q);
  let identity = asterHash(vec2f((cell.x % ${columns.toFixed(1)} + ${columns.toFixed(1)}) % ${columns.toFixed(1)}, (cell.y % ${rows.toFixed(1)} + ${rows.toFixed(1)}) % ${rows.toFixed(1)}));
  let phase = identity * 6.2831853;
  let clock = seconds * .75 + phase;
  let p = fract(q) - .5;
  // Differentiate the continuous coordinates, never a wrapped cell or a blinking point.
  let aa = max(length(fwidth(q)) * .65, .0004);
  let detail = 1.0 - smoothstep(.025, .12, aa);
  let cyan = vec3f(.14, .78, 1.0);
  let lilac = vec3f(.48, .22, 1.0);
  let gold = vec3f(1.0, .52, .13);
  let ice = vec3f(.65, .94, 1.0);
  let turn = .065 * sin(clock * .43);
  let rotation = mat2x2f(cos(turn), sin(turn), -sin(turn), cos(turn));
  let breath = 1.0 + .022 * sin(clock * 1.7);
  // A slow, locally staggered exhalation opens the graph into depth and then gathers it again.
  let release = pow(.5 + .5 * sin(seconds * .52 + phase), 12.0);
  // A coherent wave runs around the entire knot, waking each portrait in succession.
  let wake = pow(.5 + .5 * sin(q.x * ${(Math.PI * 2 / columns).toFixed(8)} - seconds * .8 + .4 * sin(q.y * ${(Math.PI * 2 / rows).toFixed(8)})), 18.0);
  let blinkPhase = (seconds + identity * 6.7) % 6.7;
  let blink = 1.0 - .94 * exp(-pow((blinkPhase - 3.7) / .13, 2.0));
  var points: array<vec2f, ${stars.length}>;
  let anchors = array<vec2f, ${stars.length}>(${stars.map(([x, y]) => `vec2f(${x.toFixed(4)}, ${y.toFixed(4)})`).join(',')});
  let edges = array<vec2u, ${links.length}>(${links.map(([a, b]) => `vec2u(${a}u, ${b}u)`).join(',')});
  for (var i = 0u; i < ${stars.length}u; i++) {
    var a = anchors[i];
    let seed = f32(i) * 2.39996 + phase;
    if (i >= 12u && i <= 19u) { a.y = .075 + (a.y - .075) * blink; }
    if (i >= 35u) {
      a.x += .015 * sin(clock * .7) + ray.x * .045;
      a.y += .007 * cos(clock * .9);
    }
    if (i == 4u || i == 8u || i == 32u || i == 33u) {
      a.x += .017 * sin(clock * 2.1 + sign(a.x));
    }
    if (i >= 25u && i <= 31u && i != 28u) { a.y += .012 * sin(clock * 2.6 + a.x * 9.0); }
    a += vec2f(sin(seed + clock), cos(seed * 1.3 + clock * .8)) * (.002 + release * .009);
    let depth = .016 + .016 * (.5 + .5 * sin(seed)) + release * .025;
    points[i] = rotation * a * breath * .94 - ray * depth;
  }
  var result = vec3f(0.0);
  // Connections remain dimmer than their stars. Discrete packets run between endpoints.
  for (var i = 0u; i < ${links.length}u; i++) {
    let e = edges[i];
    let a = points[e.x];
    let b = points[e.y];
    let ab = b - a;
    let h = clamp(dot(p - a, ab) / max(dot(ab, ab), .00001), 0.0, 1.0);
    let d = length(p - a - ab * h);
    let primary = i < 12u || (i >= 33u && i <= 38u);
    let width = select(.0012, .0021, primary);
    let line = (1.0 - smoothstep(width, width + aa, d)) * min(1.0, width * 2.0 / aa);
    let pulse = pow(.5 + .5 * cos(h * 6.2831853 - clock * 3.8 + f32(i) * .73), 16.0);
    let tint = mix(cyan, lilac, .5 + .5 * sin(phase + f32(i) * .31 + facing * 3.0));
    let eye = i >= 18u && i <= 25u;
    result += select(tint, gold, eye) * line * (select(.19, .62, primary || eye) + pulse * .95) * (1.0 - release * .38);
    let traveler = mix(a, b, fract(seconds * .22 + f32(i) * .618 + identity));
    let packet = exp(-pow(length(p - traveler) / max(.003, aa), 2.0));
    result += mix(ice, gold, .3) * packet * .55 * detail;
  }
  for (var i = 0u; i < ${stars.length}u; i++) {
    let delta = p - points[i];
    let d = length(delta);
    let pupil = i >= 35u;
    let important = i == 4u || i == 8u || i == 20u || pupil;
    let radius = select(.0065, .010, important);
    let size = max(radius, aa * .8);
    let energy = min(1.0, radius * radius / (size * size));
    let twinkle = .75 + .25 * sin(clock * 2.2 + f32(i) * 1.77);
    let core = exp(-pow(d / size, 2.0)) * energy;
    let halo = exp(-d * d / .00055) * (.13 + wake * .12);
    let tint = select(mix(ice, lilac, .25 + .2 * sin(phase + f32(i))), gold, important);
    let awake = select(1.0, blink, pupil);
    result += tint * (core * 3.8 + halo) * twinkle * awake;
    // Restrained diffraction crosses on the ear tips and nose, visible only at close range.
    if (important) {
      let cross = exp(-abs(delta.x) / max(.001, aa)) * exp(-abs(delta.y) / .023)
        + exp(-abs(delta.y) / max(.001, aa)) * exp(-abs(delta.x) / .018);
      result += tint * cross * .26 * proximity * detail * awake;
    }
  }
  // Fine, broken astrolabe ellipses behind the faces: deliberately subordinate to the silhouette.
  let orbitP = p - ray * .065;
  let ellipse = length(orbitP * vec2f(.94, 1.08));
  let theta = atan2(orbitP.y, orbitP.x);
  let arc = smoothstep(-.1, .65, sin(theta * 3.0 + clock * .32));
  let orbit = (1.0 - smoothstep(.0008, .0008 + aa, abs(ellipse - .43))) * min(1.0, .0016 / aa);
  result += mix(lilac, gold, .32) * orbit * arc * .10 * detail;
  // Pinprick stellar dust is deeper than the cats. Compact support leaves no grid seams.
  let dustQ = (q - ray * .11) * 11.0;
  let dustId = (floor(dustQ) % ${dustPeriod} + ${dustPeriod}) % ${dustPeriod};
  let random = asterHash(dustId);
  let dustP = fract(dustQ) - vec2f(.2 + random * .6, .2 + asterHash(dustId + 17.0) * .6);
  let dustAA = aa * 11.0;
  let dustSize = max(.027, dustAA);
  let dust = exp(-dot(dustP, dustP) / (dustSize * dustSize)) * min(1.0, .000729 / (dustSize * dustSize));
  result += mix(lilac, ice, random) * dust * smoothstep(.65, .9, random) * (.4 + .3 * sin(clock + random * 24.0)) * detail;
  return result * (.8 + wake * 1.65);
}
fn asterHash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`)

/** Living stellar portraits under polished midnight glass. No textures, geometry changes or postprocessing. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.42)
    this.name = data.id
    const {p, facing, grazing, objectDistance} = viewerFrame()
    const proximity = objectDistance.smoothstep(1.4, 5.2).oneMinus()
    const ray = tubeRay().mul(vec2(...constellationPeriod)).clamp(-0.45, 0.45)
    const stars = constellation(uv().mul(vec2(...constellationPeriod)), ray, time, proximity, facing) as Node<'vec3'>
    // Object-space mist is continuous across both UV seams, with much lower energy than the graph.
    const mistPoint = p.mul(4.7).add(vec3(time.mul(0.025), time.mul(-0.018), 0))
    const mist = mx_noise_float(mistPoint.add(mx_noise_float(mistPoint.mul(1.7)).mul(0.7)))
    const cloud = mist.smoothstep(-0.45, 0.8)
    const pearl = mix(color('#133451'), color('#37245d'), cloud)
    this.colorNode = mix(color('#030713'), pearl, cloud.mul(0.24))
    this.metalness = 0.48
    this.roughnessNode = float(0.27).add(cloud.mul(0.06))
    this.clearcoat = 0.65
    this.clearcoatRoughness = 0.17
    this.ior = 1.48
    this.emissiveNode = stars.mul(1.25)
      .add(mix(color('#0a777e'), color('#6128b0'), cloud).mul(cloud).mul(0.095))
      .add(mix(color('#274698'), color('#4fa7b6'), grazing).mul(grazing.pow(3)).mul(0.2))
  }
}
