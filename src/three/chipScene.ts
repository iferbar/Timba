import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { isLight } from '../lib/color'

export interface SceneChip {
  color: string
  value: number
}

const GOLD = '#e3ae45'
const GOLD_LIGHT = '#f6d77a'
const GOLD_DEEP = '#b8862a'
const HERO_BLACK = '#0b0b0c'
const FELT = '#0f3d2e'

// Alturas de la escena: tapete, montón de fichas y ficha protagonista flotando encima
const TABLE_Y = -1.3
const PILE_CHIPS = 5
const PILE_CHIP_H = 0.15
const PILE_TOP = TABLE_Y + PILE_CHIPS * PILE_CHIP_H
// Su borde de abajo (~0,98 con la inclinación) queda a ~0,18 del montón
const HERO_Y = PILE_TOP + 0.18 + 0.98

/*
 * Las fichas con detalles dorados llevan un segundo mapa (ORM) para que el oro
 * sea metal pulido y el resto plástico mate: canal verde = rugosidad, azul = metal.
 */
const ORM_PLASTIC = 'rgb(255, 165, 0)'
// Oro satinado, no espejo: reparte los reflejos y no pasa de quemado a apagado al girar
const ORM_GOLD = 'rgb(255, 100, 255)'

/** Pica de la baraja centrada en (cx, cy) */
function spadePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - s)
  ctx.bezierCurveTo(cx + s * 0.25, cy - s * 0.55, cx + s, cy - s * 0.15, cx + s * 0.92, cy + s * 0.32)
  ctx.bezierCurveTo(cx + s * 0.85, cy + s * 0.72, cx + s * 0.35, cy + s * 0.8, cx + s * 0.08, cy + s * 0.45)
  ctx.lineTo(cx + s * 0.3, cy + s)
  ctx.lineTo(cx - s * 0.3, cy + s)
  ctx.lineTo(cx - s * 0.08, cy + s * 0.45)
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.8, cx - s * 0.85, cy + s * 0.72, cx - s * 0.92, cy + s * 0.32)
  ctx.bezierCurveTo(cx - s, cy - s * 0.15, cx - s * 0.25, cy - s * 0.55, cx, cy - s)
  ctx.closePath()
}

interface FaceStyle {
  base: string
  insert: string
  ring: string
  /** Pica dorada en las fichas de Timba; valor de la ficha en las del set */
  emblem: 'spade' | number
  /** Bandas, aros y pica de oro metálico */
  gold: boolean
}

type Layer = 'color' | 'orm'

function canvasTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function newCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

/** Cara de la ficha: canto con 8 bandas, aro punteado, centro y emblema */
function drawFace(ctx: CanvasRenderingContext2D, size: number, style: FaceStyle, layer: Layer) {
  const r = size / 2
  const detail = layer === 'orm' ? ORM_GOLD : null
  ctx.save()
  ctx.translate(r, r)

  ctx.fillStyle = layer === 'orm' ? ORM_PLASTIC : style.base
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = detail ?? style.insert
  ctx.lineWidth = r * 0.16
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.91, a - 0.17, a + 0.17)
    ctx.stroke()
  }

  ctx.strokeStyle = detail ?? style.ring
  ctx.setLineDash([r * 0.05, r * 0.04])
  ctx.lineWidth = r * 0.025
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.lineWidth = r * 0.035
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2)
  ctx.stroke()

  if (style.emblem === 'spade') {
    if (detail) {
      ctx.fillStyle = detail
    } else {
      const g = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.4)
      g.addColorStop(0, GOLD_LIGHT)
      g.addColorStop(1, GOLD_DEEP)
      ctx.fillStyle = g
    }
    spadePath(ctx, 0, -r * 0.03, r * 0.72)
    ctx.fill()
  } else if (layer === 'color') {
    ctx.fillStyle = style.ring
    ctx.font = `700 ${r * (style.emblem >= 100 ? 0.42 : 0.55)}px "Fredoka Variable", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(style.emblem), 0, r * 0.04)
  }
  ctx.restore()
}

/** Canto de la ficha con las mismas 8 bandas que la cara */
function drawSide(ctx: CanvasRenderingContext2D, w: number, h: number, style: FaceStyle, layer: Layer) {
  ctx.fillStyle = layer === 'orm' ? ORM_PLASTIC : style.base
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = layer === 'orm' ? ORM_GOLD : style.insert
  const period = w / 8
  for (let i = 0; i < 8; i++) ctx.fillRect(i * period - period * 0.11, 0, period * 0.22, h)
}

/**
 * Ficha con el canto redondeado: la luz se queda en el borde y entre fichas
 * apiladas se ve el surco. Mismos grupos y UV que CylinderGeometry
 * (0 = canto, 1 = cara de arriba, 2 = cara de abajo), así sirven los mismos materiales.
 */
function chipGeometry(radius: number, height: number, bevel: number, segments: number): THREE.BufferGeometry {
  const inner = radius - bevel
  const half = height / 2
  const profile: THREE.Vector2[] = []
  const STEPS = 5
  // Cuarto de círculo abajo (de la cara al canto) y otro arriba (del canto a la cara)
  for (let i = 0; i <= STEPS; i++) {
    const a = -Math.PI / 2 + (i / STEPS) * (Math.PI / 2)
    profile.push(new THREE.Vector2(inner + Math.cos(a) * bevel, -half + bevel + Math.sin(a) * bevel))
  }
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * (Math.PI / 2)
    profile.push(new THREE.Vector2(inner + Math.cos(a) * bevel, half - bevel + Math.sin(a) * bevel))
  }
  const side = new THREE.LatheGeometry(profile, segments)

  const cap = (top: boolean) => {
    const g = new THREE.CircleGeometry(inner, segments)
    g.rotateX(top ? -Math.PI / 2 : Math.PI / 2)
    g.translate(0, top ? half : -half, 0)
    // UV como las tapas de CylinderGeometry: toda la textura de la cara cabe en la tapa
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / inner
      uv.setXY(i, (pos.getZ(i) / inner) * 0.5 + 0.5, (top ? x : -x) * 0.5 + 0.5)
    }
    return g
  }

  const parts = [side, cap(true), cap(false)]
  const geometry = mergeGeometries(parts, true)
  parts.forEach((p) => p.dispose())
  return geometry
}

/** Aleatorio con semilla: el montón queda igual de "desordenado" cada vez */
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function glowTexture(inner: string, outer = 'rgba(0,0,0,0)'): THREE.CanvasTexture {
  const [c, ctx] = newCanvas(128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return canvasTexture(c)
}

function chipMaterials(style: FaceStyle): THREE.MeshStandardMaterial[] {
  const [faceC, faceCtx] = newCanvas(512)
  drawFace(faceCtx, 512, style, 'color')
  const [sideC, sideCtx] = newCanvas(512, 32)
  drawSide(sideCtx, 512, 32, style, 'color')
  const face = canvasTexture(faceC)
  const side = canvasTexture(sideC)

  let faceOrm: THREE.Texture | null = null
  let sideOrm: THREE.Texture | null = null
  if (style.gold) {
    const [fo, foCtx] = newCanvas(512)
    drawFace(foCtx, 512, style, 'orm')
    const [so, soCtx] = newCanvas(512, 32)
    drawSide(soCtx, 512, 32, style, 'orm')
    faceOrm = canvasTexture(fo, false)
    sideOrm = canvasTexture(so, false)
  }

  // Un toque emisivo con el propio mapa de color: el oro nunca se apaga del todo
  // cuando la ficha gira hacia la sombra, y el negro (que emite negro) no cambia
  const make = (map: THREE.Texture, orm: THREE.Texture | null) =>
    orm
      ? new THREE.MeshStandardMaterial({
          map,
          metalnessMap: orm,
          roughnessMap: orm,
          metalness: 1,
          roughness: 1,
          emissiveMap: map,
          emissive: '#ffffff',
          emissiveIntensity: 0.16,
        })
      : new THREE.MeshStandardMaterial({ map, metalness: 0, roughness: 0.5 })
  // CylinderGeometry: grupo 0 = canto, 1 = cara de arriba, 2 = cara de abajo
  const faceMat = make(face, faceOrm)
  return [make(side, sideOrm), faceMat, faceMat]
}

function setChipStyle(chip: SceneChip): FaceStyle {
  const light = isLight(chip.color)
  const detail = light ? '#2b4a8a' : '#f3efe2'
  return { base: chip.color, insert: detail, ring: detail, emblem: chip.value, gold: false }
}

/** Ficha desenfocada (lejos, o muy cerca de la cámara con más desenfoque) */
function blurredChipTexture(chip: SceneChip, blur: number): THREE.CanvasTexture {
  // Cuanto más desenfoque, más margen para que no se corte en el borde del lienzo
  const chipSize = blur > 12 ? 150 : 192
  const [src, srcCtx] = newCanvas(chipSize)
  drawFace(srcCtx, chipSize, setChipStyle(chip), 'color')
  const [c, ctx] = newCanvas(256)
  ctx.filter = `blur(${blur}px)`
  ctx.drawImage(src, (256 - chipSize) / 2, (256 - chipSize) / 2)
  return canvasTexture(c)
}

/**
 * Estudio fotográfico oscuro con tiras de luz, solo para los reflejos: el
 * negro refleja oscuridad y sigue negro, y el oro refleja las tiras y brilla.
 */
function studioEnvironment(pmrem: THREE.PMREMGenerator): THREE.Texture {
  const env = new THREE.Scene()
  env.background = new THREE.Color('#07110d')
  // Muchas luces cálidas, grandes y moderadas: en cualquier ángulo el oro tiene
  // algo que reflejar, y ninguna es tan fuerte como para quemarlo a blanco
  const panels: [number, number, string, number, [number, number, number]][] = [
    [8, 3, '#ffe7bd', 2.6, [0, 6, 2]], // softbox cenital
    [2.5, 7, '#ffd894', 2.4, [6, 1, 3]], // derecha
    [2.5, 7, '#ffd08a', 2.2, [-6, 1, 3]], // izquierda
    [8, 2.5, '#ffcf80', 1.6, [0, -3, 6]], // relleno bajo frontal
    [3, 6, '#ffc870', 1.8, [-5, 2, -4]], // contraluz izquierdo
    [3, 6, '#ffc870', 1.8, [5, 2, -4]], // contraluz derecho
  ]
  for (const [w, h, color, intensity, pos] of panels) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    env.add(m)
  }
  const texture = pmrem.fromScene(env, 0.02).texture
  env.traverse((o) => {
    const mesh = o as THREE.Mesh
    mesh.geometry?.dispose()
    ;(mesh.material as THREE.Material | undefined)?.dispose()
  })
  return texture
}

interface NearChip {
  mesh: THREE.Mesh
  base: THREE.Vector3
  spin: THREE.Vector2
  phase: number
}

interface FarChip {
  sprite: THREE.Sprite
  base: THREE.Vector3
  size: number
  phase: number
  /** Velocidad del giro de moneda; 0 = siempre redonda */
  flip: number
}

export interface ChipSceneHandle {
  dispose(): void
}

/**
 * Escena de la pantalla de inicio: la ficha de Timba flotando sobre un montón
 * en el tapete, con aros dorados, luces desenfocadas y fichas del set alrededor.
 * `topInset` da los px de arriba que tapa el título: la ficha protagonista nunca
 * sube por encima (en pantallas bajas la cámara se aleja un poco).
 */
export function createChipScene(
  host: HTMLElement,
  chips: SceneChip[],
  reducedMotion: boolean,
  topInset: () => number = () => 0,
): ChipSceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const fog = new THREE.Fog(FELT, 8, 15)
  scene.fog = fog
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = studioEnvironment(pmrem)
  scene.environment = envTexture

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
  const cameraBase = new THREE.Vector3(0, 0.75, 7.4)
  const lookAt = new THREE.Vector3(0, -0.15, 0)
  camera.position.copy(cameraBase)

  scene.add(new THREE.HemisphereLight('#ffe6b0', '#06140f', 0.25))
  const key = new THREE.DirectionalLight('#fff1d0', 1.6)
  key.position.set(2.5, 4, 4)
  scene.add(key)
  // Contraluz dorado: dibuja el borde de la ficha sin lavar la cara
  const backGold = new THREE.PointLight('#ffc260', 12, 7, 1.4)
  backGold.position.set(0, HERO_Y + 1.4, -1.4)
  scene.add(backGold)
  const rim = new THREE.DirectionalLight('#7fe0b0', 0.5)
  rim.position.set(-3, 2, -4)
  scene.add(rim)

  const palette: SceneChip[] = chips.length > 0 ? chips : [{ color: '#c0392b', value: 10 }]

  // La ficha protagonista
  const HERO_BEVEL = 0.05
  const hero = new THREE.Mesh(
    chipGeometry(1, 0.2, HERO_BEVEL, 96),
    chipMaterials({ base: HERO_BLACK, insert: GOLD, ring: GOLD, emblem: 'spade', gold: true }),
  )
  const heroPivot = new THREE.Group()
  heroPivot.position.set(0, HERO_Y, 0)
  hero.rotation.x = Math.PI / 2 - 0.32
  heroPivot.add(hero)
  scene.add(heroPivot)

  // Destello: una franja de luz que cruza la cara cada pocos segundos, más
  // intensa sobre el oro (usa el mismo mapa de metal como máscara)
  const SHINE_EVERY = 4.5
  const shineMat = new THREE.ShaderMaterial({
    uniforms: {
      uPos: { value: -1 },
      uRadius: { value: 1 - HERO_BEVEL },
      uMask: { value: (hero.material as THREE.MeshStandardMaterial[])[1].metalnessMap },
    },
    vertexShader: /* glsl */ `
      uniform float uRadius;
      varying vec2 vUv;
      void main() {
        // Mismas UV que la tapa de la ficha, para que la máscara case
        vec2 p = position.xy / uRadius;
        vUv = vec2(0.5 - p.y * 0.5, 0.5 + p.x * 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uPos;
      uniform sampler2D uMask;
      varying vec2 vUv;
      void main() {
        float d = (vUv.x + vUv.y) * 0.5 - uPos;
        float band = exp(-d * d * 200.0);
        float gold = texture2D(uMask, vUv).b;
        float edge = smoothstep(0.5, 0.46, distance(vUv, vec2(0.5)));
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.72) * band * (0.15 + 1.1 * gold) * edge, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const shine = new THREE.Mesh(new THREE.CircleGeometry(1 - HERO_BEVEL, 96), shineMat)
  shine.rotation.x = -Math.PI / 2
  shine.position.y = 0.101
  shine.visible = !reducedMotion
  hero.add(shine)

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,190,80,0.7)'),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  )
  glow.scale.set(5.2, 5.2, 1)
  glow.position.set(0, HERO_Y + 0.08, -1.2)
  scene.add(glow)

  // Aros dorados abiertos alrededor de la ficha, con chispas a lo largo
  const swirlMat = new THREE.MeshBasicMaterial({
    color: '#ffcf6b',
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const sparkTexture = glowTexture('rgba(255,240,200,1)')
  const sparkMats: THREE.PointsMaterial[] = []
  const swirls = [
    { radius: 1.45, tube: 0.016, arc: Math.PI * 1.35, tilt: 1.2, speed: 0.5, sparks: 70 },
    { radius: 1.72, tube: 0.008, arc: Math.PI * 0.9, tilt: 1.32, speed: -0.35, sparks: 30 },
  ].map((s) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(s.radius, s.tube, 8, 160, s.arc), swirlMat)
    const pos = new Float32Array(s.sparks * 3)
    for (let i = 0; i < s.sparks; i++) {
      // Más densas al final del arco, como la estela de un cometa
      const a = s.arc * Math.pow(Math.random(), 0.6)
      const r = s.radius + (Math.random() - 0.5) * 0.12
      pos.set([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.1], i * 3)
    }
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const sparkMat = new THREE.PointsMaterial({
      size: 0.09,
      map: sparkTexture,
      color: '#ffd98a',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    sparkMats.push(sparkMat)
    mesh.add(new THREE.Points(sparkGeo, sparkMat))
    const holder = new THREE.Group()
    holder.position.set(0, HERO_Y - 0.07, 0)
    holder.rotation.set(s.tilt, 0, 0.18)
    holder.add(mesh)
    scene.add(holder)
    return { mesh, speed: s.speed }
  })

  // Materiales de las fichas del set, compartidos entre todas las que llevan el mismo color
  const setMaterials = new Map<string, THREE.MeshStandardMaterial[]>()
  const materialsFor = (chip: SceneChip) => {
    const key = `${chip.color}-${chip.value}`
    if (!setMaterials.has(key)) setMaterials.set(key, chipMaterials(setChipStyle(chip)))
    return setMaterials.get(key)!
  }

  /** Pila apilada a mano: cada ficha un poco movida, girada e inclinada */
  const rand = seededRandom(7)
  const addPile = (
    x: number,
    z: number,
    geometry: THREE.BufferGeometry,
    height: number,
    materials: THREE.Material[][],
    count: number,
    jitter: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geometry, materials[i % materials.length])
      const top = i === count - 1
      m.position.set(x + (rand() - 0.5) * jitter, TABLE_Y + height / 2 + i * height, z + (rand() - 0.5) * jitter)
      // La de arriba, plana: sobre ella cae la sombra de la ficha protagonista
      const tilt = top ? 0 : 0.035
      m.rotation.set((rand() - 0.5) * tilt, rand() * Math.PI * 2, (rand() - 0.5) * tilt)
      scene.add(m)
    }
  }

  // Montón bajo la protagonista: negras y verdes con oro, casi de su mismo tamaño
  addPile(
    0,
    0,
    chipGeometry(0.95, PILE_CHIP_H, 0.035, 72),
    PILE_CHIP_H,
    [
      chipMaterials({ base: '#0e4a33', insert: GOLD, ring: GOLD, emblem: 'spade', gold: true }),
      chipMaterials({ base: HERO_BLACK, insert: GOLD, ring: GOLD, emblem: 'spade', gold: true }),
    ],
    PILE_CHIPS,
    0.09,
  )

  // Una pila baja con las fichas pequeñas del set y la de más valor suelta en el
  // tapete: así se ven todos los colores
  const smallGeo = chipGeometry(0.52, 0.09, 0.022, 56)
  addPile(1.3, 0.75, smallGeo, 0.09, palette.slice(0, 3).map(materialsFor), 3, 0.06)
  const loose = new THREE.Mesh(smallGeo, materialsFor(palette[palette.length - 1]))
  loose.position.set(-1.25, TABLE_Y + 0.045, 0.95)
  loose.rotation.y = 0.8
  scene.add(loose)

  // Tapete: fieltro con fibras (ruido fino) que se funde con el fondo, con un aro de latón
  const FELT_SIZE = 512
  const [feltC, feltCtx] = newCanvas(FELT_SIZE)
  const half = FELT_SIZE / 2
  const feltGrad = feltCtx.createRadialGradient(half, half, 0, half, half, half)
  feltGrad.addColorStop(0, '#1b5f45')
  feltGrad.addColorStop(0.6, '#134c37')
  feltGrad.addColorStop(1, '#0d3a2b')
  feltCtx.fillStyle = feltGrad
  feltCtx.fillRect(0, 0, FELT_SIZE, FELT_SIZE)
  const fibres = feltCtx.getImageData(0, 0, FELT_SIZE, FELT_SIZE)
  for (let i = 0; i < fibres.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16
    fibres.data[i] += n
    fibres.data[i + 1] += n
    fibres.data[i + 2] += n
  }
  feltCtx.putImageData(fibres, 0, 0)
  const [alphaC, alphaCtx] = newCanvas(256)
  const alphaGrad = alphaCtx.createRadialGradient(128, 128, 0, 128, 128, 128)
  alphaGrad.addColorStop(0, '#fff')
  alphaGrad.addColorStop(0.7, '#ddd')
  alphaGrad.addColorStop(1, '#000')
  alphaCtx.fillStyle = alphaGrad
  alphaCtx.fillRect(0, 0, 256, 256)
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 72),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(feltC),
      alphaMap: canvasTexture(alphaC, false),
      transparent: true,
      roughness: 1,
      depthWrite: false,
    }),
  )
  table.rotation.x = -Math.PI / 2
  table.position.y = TABLE_Y
  scene.add(table)

  const brass = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.04, 12, 180),
    new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 }),
  )
  brass.rotation.x = -Math.PI / 2
  brass.position.y = TABLE_Y + 0.02
  scene.add(brass)

  /** Disco plano sobre el tapete: sombras de contacto y el reflejo dorado de la ficha */
  const decal = (radius: number, texture: THREE.Texture, x: number, y: number, z: number, additive = false) => {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 48),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, y, z)
    scene.add(mesh)
    return mesh
  }
  const shadowTexture = glowTexture('rgba(0,0,0,0.85)')
  // Charco de luz dorada que la ficha protagonista deja en el fieltro
  decal(2.4, glowTexture('rgba(255,186,80,0.22)'), 0, TABLE_Y + 0.003, 0.3, true)
  decal(1.6, shadowTexture, 0, TABLE_Y + 0.005, 0)
  decal(1.1, shadowTexture, 0, TABLE_Y + 0.006, 0)
  decal(0.8, shadowTexture, 1.3, TABLE_Y + 0.005, 0.75)
  decal(0.7, shadowTexture, -1.25, TABLE_Y + 0.005, 0.95)
  // Sombra de la protagonista sobre el montón: se aclara cuando sube
  const heroShadow = decal(0.85, glowTexture('rgba(0,0,0,0.75)'), 0, PILE_TOP + 0.004, 0.08)

  /*
   * Las fichas sueltas se colocan por posición en pantalla (x, y de -1 a 1) y
   * profundidad, y se recalculan al cambiar el tamaño: así ninguna queda cortada
   * por el borde ni detrás del logotipo, sea cual sea la proporción del móvil.
   */
  const nearGeo = chipGeometry(1, 0.2, 0.05, 48)
  const nearSpots: [number, number, number, number][] = [
    [-0.8, 0.24, 0.6, 0.28],
    [0.8, 0.0, 1.0, 0.32],
    [-0.78, -0.28, 1.6, 0.24],
  ]
  const nearChips: NearChip[] = nearSpots.map(([, , z, s], i) => {
    const mesh = new THREE.Mesh(nearGeo, materialsFor(palette[(i + 1) % palette.length]))
    mesh.scale.setScalar(s)
    // Balanceo en vez de vueltas completas (ver render): nunca se ponen de canto
    mesh.rotation.order = 'XZY'
    const base = new THREE.Vector3(0, 0, z)
    scene.add(mesh)
    return { mesh, base, phase: i * 2.1, spin: new THREE.Vector2(0.45 + i * 0.1, 0.3 + i * 0.12) }
  })

  /*
   * Fichas desenfocadas, para dar profundidad: una grande muy cerca de la cámara
   * (arriba a la derecha) y varias pequeñas al fondo. Ninguna en el centro de
   * arriba, donde va el título.
   * [x, y en pantalla, profundidad, tamaño, desenfoque, ficha del set]
   */
  const farSpots: [number, number, number, number, number, number][] = [
    [0.88, 0.6, 3.2, 1.3, 16, 1],
    [-0.72, 0.72, -5.5, 0.8, 9, 3],
    [0.36, 0.42, -4.6, 0.7, 9, 2],
    [-0.5, 0.36, -5.2, 0.7, 9, 0],
  ]
  const farChips: FarChip[] = farSpots.map(([, , z, size, blur, chip], i) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: blurredChipTexture(palette[chip % palette.length], blur),
        transparent: true,
        depthWrite: false,
        // La de delante, algo translúcida: no debe tapar nada importante
        opacity: blur > 12 ? 0.8 : 1,
      }),
    )
    const base = new THREE.Vector3(0, 0, z)
    scene.add(sprite)
    // La de delante no gira como una moneda: tan desenfocada, al estrecharse parece una mancha
    return { sprite, base, size, phase: i * 1.3, flip: blur > 12 ? 0 : 0.5 + (i % 4) * 0.2 }
  })

  const ray = new THREE.Vector3()
  /** Lleva `target` al punto de profundidad `target.z` que se ve en (nx, ny), sin salirse del borde */
  const placeOnScreen = (target: THREE.Vector3, nx: number, ny: number, radius: number) => {
    // Medio ancho visible a esa profundidad; el texto de la ficha no debe tocar el borde
    const halfW = (camera.position.z - target.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect
    const limit = Math.max(0, 1 - (radius + 0.12) / halfW)
    const x = THREE.MathUtils.clamp(nx, -limit, limit)
    ray.set(x, ny, 0.5).unproject(camera).sub(camera.position).normalize()
    const z = target.z
    target.copy(camera.position).addScaledVector(ray, (z - camera.position.z) / ray.z)
  }

  // Luces desenfocadas del fondo
  const bokehCount = 70
  const bokehPos = new Float32Array(bokehCount * 3)
  const bokehCol = new Float32Array(bokehCount * 3)
  const warm = new THREE.Color('#ffc65a')
  const green = new THREE.Color('#5fd39a')
  for (let i = 0; i < bokehCount; i++) {
    bokehPos.set([(Math.random() - 0.5) * 12, (Math.random() - 0.2) * 7, -5 - Math.random() * 5], i * 3)
    const c = Math.random() < 0.75 ? warm : green
    bokehCol.set([c.r, c.g, c.b], i * 3)
  }
  const bokehGeo = new THREE.BufferGeometry()
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPos, 3))
  bokehGeo.setAttribute('color', new THREE.BufferAttribute(bokehCol, 3))
  const bokeh = new THREE.Points(
    bokehGeo,
    new THREE.PointsMaterial({
      size: 0.55,
      map: glowTexture('rgba(255,255,255,0.9)'),
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  )
  scene.add(bokeh)

  // Al tocar la ficha protagonista, da una vuelta
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const parallax = new THREE.Vector2()
  let spinStart = -Infinity
  const SPIN_MS = 1100

  const onPointerDown = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.intersectObject(hero).length > 0) {
      spinStart = performance.now()
      if (reducedMotion) render(performance.now())
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    parallax.set(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1)
  }
  host.addEventListener('pointerdown', onPointerDown)
  host.addEventListener('pointermove', onPointerMove)

  // Punto más cercano del aro de latón y espacio que ocupa el botón (se monta
  // ~24 px sobre la escena) más un respiro
  const tableFront = new THREE.Vector3(0, TABLE_Y, 2.39)
  const projected = new THREE.Vector3()
  const FRAME_BOTTOM = 36
  const heroTop = new THREE.Vector3(0, HERO_Y + 1.05, 0)

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    // Se aleja la cámara lo justo para que el aro de latón quepa a lo ancho (con un
    // pequeño margen) y, en pantallas bajas, para que quepa la escena a lo alto
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.updateProjectionMatrix()

    // Sube cámara y objetivo a la vez (la escena baja sin cambiar la perspectiva)
    // hasta que el borde del tapete quede justo encima del botón, que se monta
    // FRAME_BOTTOM px sobre la escena. La cámara mira casi a ras de mesa, desde
    // abajo: así la ficha y el montón se ven más imponentes
    const aim = (shift: number) => {
      lookAt.y = -0.15 + shift
      cameraBase.y = lookAt.y + 0.9
      camera.position.copy(cameraBase)
      camera.lookAt(lookAt)
      camera.updateMatrixWorld()
    }
    const target = -1 + (2 * FRAME_BOTTOM) / h
    // Borde de arriba de la ficha (con su balanceo) bajo el título, con un respiro
    const ceiling = 1 - (2 * (topInset() + 10)) / h
    let distance = Math.max(2.5 / (tanHalf * camera.aspect), 8.2)
    for (let attempt = 0; attempt < 12; attempt++) {
      cameraBase.z = distance
      const halfH = (cameraBase.z - tableFront.z) * tanHalf
      let shift = 0.5
      for (let k = 0; k < 4; k++) {
        aim(shift)
        // Nunca por debajo de 0: la escena subiría hacia el título
        shift = THREE.MathUtils.clamp(shift + (projected.copy(tableFront).project(camera).y - target) * halfH, 0, 1.4)
      }
      aim(shift)
      if (projected.copy(heroTop).project(camera).y <= ceiling) break
      distance *= 1.05
    }
    fog.near = cameraBase.z + 1
    fog.far = cameraBase.z + 8
    nearChips.forEach((c, i) => placeOnScreen(c.base, nearSpots[i][0], nearSpots[i][1], nearSpots[i][3] + 0.08))
    // La textura deja margen alrededor de la ficha: el radio real es ~0,38 del tamaño
    farChips.forEach((f, i) => placeOnScreen(f.base, farSpots[i][0], farSpots[i][1], f.size * 0.38))
    render(performance.now())
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)

  function render(now: number) {
    const t = reducedMotion ? 0 : now / 1000

    const spinT = Math.min(1, (now - spinStart) / SPIN_MS)
    const spin = spinT < 1 ? easeOutCubic(spinT) * Math.PI * 2 : 0
    heroPivot.rotation.y = Math.sin(t * 0.55) * 0.42 + spin
    const bob = Math.sin(t * 1.1) * 0.06
    heroPivot.position.y = HERO_Y + bob
    heroShadow.material.opacity = 0.8 - bob * 3
    heroShadow.scale.setScalar(1 + bob * 1.5)
    // Cruza la cara en 0,9 s y desaparece hasta la siguiente pasada
    shineMat.uniforms.uPos.value = -0.2 + (((t + 3) % SHINE_EVERY) / 0.9) * 1.4

    for (const s of swirls) s.mesh.rotation.z = t * s.speed
    for (const m of sparkMats) m.opacity = 0.65 + Math.sin(t * 3) * 0.25

    for (const c of nearChips) {
      // Se balancean con la cara hacia la cámara y giran sobre su propio eje
      c.mesh.rotation.x = 1.35 + Math.sin(t * c.spin.x + c.phase) * 0.5
      c.mesh.rotation.z = (c.phase - 2) * 0.2 + Math.sin(t * c.spin.y + c.phase) * 0.35
      c.mesh.rotation.y = c.phase + t * 0.5
      c.mesh.position.set(
        c.base.x + Math.sin(t * 0.4 + c.phase) * 0.08,
        c.base.y + Math.sin(t * 0.7 + c.phase) * 0.14,
        c.base.z,
      )
    }
    for (const f of farChips) {
      // Girar una moneda vista de frente: se estrecha y vuelve a abrirse (sin llegar
      // a ponerse de canto, que de lejos y desenfocada parece una mancha)
      const open = f.flip ? 0.5 + 0.5 * Math.abs(Math.cos(t * f.flip + f.phase)) : 1
      f.sprite.scale.set(f.size, f.size * open, 1)
      f.sprite.material.rotation = f.phase + t * 0.15
      f.sprite.position.set(f.base.x, f.base.y + Math.sin(t * 0.3 + f.phase) * 0.2, f.base.z)
    }
    bokeh.rotation.z = Math.sin(t * 0.05) * 0.05
    glow.material.opacity = 0.8 + Math.sin(t * 1.6) * 0.1

    camera.position.x += (cameraBase.x + parallax.x * 0.35 - camera.position.x) * 0.05
    camera.position.y += (cameraBase.y - parallax.y * 0.2 - camera.position.y) * 0.05
    camera.lookAt(lookAt)
    renderer.render(scene, camera)
  }

  // Solo se anima con la app visible; con "reducir movimiento" queda una imagen fija
  const start = () => {
    if (reducedMotion) renderer.setAnimationLoop(null)
    else renderer.setAnimationLoop(render)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') start()
    else renderer.setAnimationLoop(null)
  }
  document.addEventListener('visibilitychange', onVisibility)
  start()

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      const textures = new Set<THREE.Texture>()
      scene.traverse((obj) => {
        const o = obj as THREE.Mesh
        o.geometry?.dispose()
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
        for (const m of mats) {
          const sm = m as THREE.MeshStandardMaterial
          for (const tex of [sm.map, sm.metalnessMap, sm.roughnessMap, sm.alphaMap]) if (tex) textures.add(tex)
          m.dispose()
        }
      })
      textures.forEach((tex) => tex.dispose())
      envTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
