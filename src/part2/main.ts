import * as THREE from 'three';

// ----------------------------
// Parámetros ajustables
// ----------------------------
const STAR_COUNT = 8000;      // cantidad de estrellas (reducido para rendimiento)
const Z_FAR = -2000;         // profundidad máxima (fondo)
const Z_NEAR = 0;            // frente (cerca de la cámara)
const SPEED = 5000;          // velocidad en unidades por segundo (aumentada)
const SIZE_MIN = 0.6;        // tamaño base mínimo (más variación)
const SIZE_MAX = 4.0;        // tamaño base máximo (más variación)
const CENTRAL_CLEAR_RADIUS = 140; // radio (en px) del centro libre de partículas

// ----- aceleración al inicio
const START_SPEED_FACTOR = 0.20; // inicio más rápido (fracción de SPEED)
const ACCEL_DURATION = 8.0;      // segundos para llegar a velocidad completa
const ACCEL_POWER = 2.0;         // potencia para easing (t^2 => acelera más rápido al inicio)

// ----- iluminación al final de la rampa
const LIGHT_FADE_DURATION = 3.0; // segundos para el fade-in de la pantalla
const MAX_LIGHT_OPACITY = 0.85;  // opacidad máxima del overlay blanco

// ----------------------------
// Efecto de estiramiento visual (CSS) según aceleración
// ----------------------------
const STRETCH_MAX = 1.0;         // estiramiento vertical máximo (1.0 => +100% altura)
const STRETCH_AXIS_FACTOR = 0.5;  // cuánto se expande el eje X relativo al estiramiento Y

// ----------------------------
// Glow central (aparece a 4000, cubre a 5000)
// ----------------------------
const GLOW_APPEAR_SPEED = 4000; // velocidad a partir de la cual el glow comienza a aparecer
const GLOW_FULL_SPEED = 5000;   // velocidad a la que el glow debe poder cubrir la pantalla
const GLOW_BASE_SCALE = 80;     // escala inicial del glow
const GLOW_MAX_SCALE_FACTOR = 6; // multiplicador del máximo dimension para cubrir la pantalla
const GLOW_BASE_OPACITY = 0.06; // opacidad inicial sutil
const GLOW_MAX_OPACITY = 0.98;  // opacidad máxima cuando cubre la pantalla
const GLOW_GROWTH_POWER = 5.0;  // curva de crecimiento (mayor => más lento al inicio)
const GLOW_FLICKER_FREQ = 6.0;   // frecuencia del titileo (Hz)
const GLOW_FLICKER_AMPLITUDE = 0.09; // amplitud del titileo en opacidad
const glowFlickerPhase = Math.random() * Math.PI * 2;

// ----------------------------
// Escena básica
// ----------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 5000);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 1);
// ensure the renderer canvas is identifiable and stays visible when we inject global hide rules
renderer.domElement.id = 'part2-canvas';
renderer.domElement.setAttribute('data-part', 'part2');
document.body.appendChild(renderer.domElement);

// Diagnostics
console.log('MAIN: renderer created', renderer.domElement);
console.log('TITLE: script loaded');
// global error hook to make sure runtime errors get reported in the console
window.addEventListener('error', (ev) => console.error('GLOBAL ERROR', ev.message, ev.filename, ev.lineno, ev.error));
// capabilities.isWebGL2/isWebGL1 are available in three.js
// @ts-ignore
if (!(renderer.capabilities && (renderer.capabilities.isWebGL2 || renderer.capabilities.isWebGL1))) {
  console.warn('MAIN: WebGL not available according to renderer.capabilities');
}
// quick context dump if possible
// @ts-ignore
console.log('MAIN: gl context', renderer.getContext ? renderer.getContext() : null);

// UI minimal
// (diagnostic info removed at user's request)

// Título inferior central: "Entering the solar system..." (negro + gris)
// Estructura: icon (SVG) + texto (dos spans) para mantener estilos y contorno al inyectar SVG
const entering = document.createElement('div');
entering.className = 'entering';
entering.innerHTML = `
  <span class="entering-text">
    <span class="entering-black">Entering the</span>
    <span class="entering-gray">solar system...</span>
  </span>
  <span class="entering-icon" aria-hidden="true"></span>
`;
document.body.appendChild(entering);
console.log('TITLE: entering element created', entering);

// Intentar cargar un SVG personalizado si existe en `src/assets/title.svg` y usarlo para el título.
(async () => {
  // Inline fallback SVG (guaranteed to display even if fetch fails)
  const INLINE_GALAXY_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="20" height="20" aria-hidden="true" role="img">
      <defs>
        <style>
          .s{fill:none;stroke:#ffffff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
          .f{fill:#ffffff;stroke:#ffffff;stroke-width:2}
        </style>
      </defs>
      <!-- Outer rings -->
      <circle cx="60" cy="60" r="48" class="s" />
      <circle cx="60" cy="60" r="36" class="s" />
      <!-- Central filled planet -->
      <circle cx="60" cy="60" r="22" class="f" />
      <!-- Wing-like rings on each side -->
      <ellipse cx="18" cy="60" rx="26" ry="9" class="s" />
      <ellipse cx="102" cy="60" rx="26" ry="9" class="s" />
    </svg>`;
  try {
    // Intentamos primero `title.svg`, si no existe probamos `galaxy.svg` y luego cualquier `*.svg` en la carpeta
    const candidates = [new URL('../assets/title.svg', import.meta.url).href, new URL('../assets/galaxy.svg', import.meta.url).href];
    let loaded = false;
      for (const c of candidates) {
        try {
          const r = await fetch(c);
          if (r.ok) {
            const svg = await r.text();
            entering.classList.add('entering-svg');
            // insert the SVG into the .entering-icon container so we keep the text spans
            const iconEl = entering.querySelector('.entering-icon') as HTMLElement | null;
            if (iconEl) {
              iconEl.innerHTML = svg;
              const svgEl = iconEl.querySelector('svg') as SVGElement | null;
              if (svgEl) {
                // tamaño pequeño por defecto; el usuario puede ajustar
                svgEl.setAttribute('width', '20');
                svgEl.setAttribute('height', '20');
                svgEl.style.display = 'block';
                svgEl.style.margin = '0';
              }
            }
            console.log('TITLE: loaded external SVG from', c);
            loaded = true;
            break;
          } else {
            console.warn('TITLE: fetch', c, 'returned', r.status);
          }
        } catch (inner) {
          console.warn('TITLE: fetch error for', c, inner);
        }
      }
    // si no encontramos las candidates, dejamos el texto por defecto
    const iconEl = entering.querySelector('.entering-icon') as HTMLElement | null;
    if (iconEl) {
      if (!loaded) {
        // If fetch didn't work, inline the SVG we created above so it always appears
        iconEl.innerHTML = INLINE_GALAXY_SVG;
        entering.classList.add('entering-svg-inline');
        console.log('TITLE: using inline SVG fallback');
      }
      // Ensure the icon is present even if fetch succeeded but returned empty content
      if (!iconEl.innerHTML || !iconEl.innerHTML.trim()) {
        iconEl.innerHTML = INLINE_GALAXY_SVG;
        entering.classList.add('entering-svg-inline');
        console.log('TITLE: injected inline SVG as safety fallback');
      }
      // ensure the icon is visible and sized correctly
      const svgEl = iconEl.querySelector('svg') as SVGElement | null;
      if (svgEl) {
        svgEl.setAttribute('width', svgEl.getAttribute('width') || '20');
        svgEl.setAttribute('height', svgEl.getAttribute('height') || '20');
      }
    }
  } catch (e) {
    // no-op
  }
})();

// overlay blanco para iluminado gradual (invisible al inicio)
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.left = '0';
overlay.style.top = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.background = '#ffffff';
overlay.style.opacity = '0';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '10';
// suavizamos cambios manualmente (no obligatorio):
overlay.style.transition = 'opacity 0.15s linear';
document.body.appendChild(overlay);

// Transition overlay used to fade into Part 3
const transitionOverlay = document.createElement('div');
Object.assign(transitionOverlay.style, {
  position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
  background: '#000000', opacity: '0', transition: 'opacity 0.7s ease', pointerEvents: 'none', zIndex: '999'
});
document.body.appendChild(transitionOverlay);

// ----------------------------
// BufferGeometry para estrellas
// ----------------------------
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(STAR_COUNT * 3);
const sizes = new Float32Array(STAR_COUNT);

for (let i = 0; i < STAR_COUNT; i++) {
  // Aseguramos que el círculo central quede despejado
  let x: number, y: number;
  do {
    x = (Math.random() * 2 - 1) * innerWidth;   // X aleatorio
    y = (Math.random() * 2 - 1) * innerHeight;  // Y aleatorio
  } while (Math.hypot(x, y) < CENTRAL_CLEAR_RADIUS);

  positions[i * 3 + 0] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = Math.random() * (Z_NEAR - Z_FAR) + Z_FAR; // Z entre -2000 y 0
  sizes[i] = Math.random() * (SIZE_MAX - SIZE_MIN) + SIZE_MIN;   // tamaño base
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// ----------------------------
// ShaderMaterial para puntos (control de tamaño por distancia y suavizado)
// ----------------------------
const vertexShader = `
  attribute float size;
  uniform float uPointScale;
  uniform float uMinPointSize;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // La fórmula hace que puntos cercanos se vean más grandes (parallax)
    float psize = size * (uPointScale / -mvPosition.z);
    psize = max(psize, uMinPointSize);
    gl_PointSize = psize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform vec3 color;
  void main() {
    // gl_PointCoord va de 0..1
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.6) discard; // forma circular (suavizada)
    float alpha = 1.0 - smoothstep(0.25, 0.6, dist);
    gl_FragColor = vec4(color, alpha);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xffffff) },
    uPointScale: { value: 900.0 }, // menos escala para variar más por size
    uMinPointSize: { value: 0.9 }
  },
  vertexShader,
  fragmentShader,
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// --- Debug helpers: add a visible mesh and a few test points to confirm rendering ---
const debugSphere = new THREE.Mesh(
  new THREE.SphereGeometry(30, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false })
);
// Dibujar siempre encima para crear un "hoyo" negro en el centro
debugSphere.position.set(0, 0, -500);
debugSphere.renderOrder = 999;
scene.add(debugSphere);

console.log('DEBUG: added debug sphere (black)');

// More diagnostics: canvas size, renderer info
console.log('DEBUG: canvas size (width/height)', renderer.domElement.width, renderer.domElement.height, 'offset', renderer.domElement.offsetWidth, renderer.domElement.offsetHeight);
console.log('DEBUG: renderer pixelRatio', renderer.getPixelRatio(), 'devicePixelRatio', window.devicePixelRatio);

// Ensure canvas is on top and visible (use fixed positioning so it survives body>*>display:none rules)
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.left = '0px';
renderer.domElement.style.top = '0px';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '999';
renderer.domElement.style.transformOrigin = '50% 50%';
renderer.domElement.style.willChange = 'transform';

// ----------------------------
// Sprite radial para glow central
// ----------------------------
const glowCanvas = document.createElement('canvas');
glowCanvas.width = 256;
glowCanvas.height = 256;
const gctx = glowCanvas.getContext('2d')!;
const grad = gctx.createRadialGradient(128, 128, 10, 128, 128, 128);
grad.addColorStop(0, 'rgba(255,255,200,1)');
grad.addColorStop(0.2, 'rgba(255,230,140,0.6)');
grad.addColorStop(1, 'rgba(255,200,80,0)');
gctx.fillStyle = grad;
gctx.fillRect(0, 0, 256, 256);

const glowTex = new THREE.CanvasTexture(glowCanvas);
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, opacity: GLOW_BASE_OPACITY });
const glow = new THREE.Sprite(glowMat);
glow.scale.set(GLOW_BASE_SCALE, GLOW_BASE_SCALE, 1);
glow.position.set(0, 0, 0); // lo colocamos cerca del centro; lo moveremos frente de la cámara si hace falta
scene.add(glow);

// Frustum / visibility checks
let debugLogsPrinted = 0;
function checkVisibility() {
  // build frustum
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(projScreenMatrix);

  const sphereVisible = frustum.intersectsObject(debugSphere);
  console.log('DEBUG: sphereVisible =', sphereVisible);

  // sample world positions to project (no testPos dependency)
  const v = new THREE.Vector3();
  const samplePoints = [
    new THREE.Vector3(0, 0, -400),
    new THREE.Vector3(120, 40, -600),
    new THREE.Vector3(-140, -60, -800)
  ];
  samplePoints.forEach((pt, idx) => {
    v.copy(pt).project(camera); // NDC
    const visible = v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z >= -1 && v.z <= 1;
    console.log(`DEBUG: samplePoint ${idx} NDC`, v.x.toFixed(2), v.y.toFixed(2), v.z.toFixed(2), 'visible=', visible);
  });

  // print WebGL errors if any
  try {
    // @ts-ignore
    const gl = renderer.getContext();
    if (gl && gl.getError) {
      const err = gl.getError();
      if (err !== gl.NO_ERROR) console.warn('DEBUG: WebGL error code', err);
    }
  } catch (e) {
    console.warn('DEBUG: could not query WebGL error', e);
  }

  debugLogsPrinted++;
}

// Call once after a slight delay to ensure camera matrices updated
setTimeout(() => checkVisibility(), 200);


// ----------------------------
// Animación: movemos las estrellas hacia adelante (z += speed * dt)
// NO movemos la cámara
// ----------------------------
const clock = new THREE.Clock();
let _transitionStarted = false;
let _keepAnimating = true;
let _rafId: number | null = null;

function animate() {
  _rafId = requestAnimationFrame(animate);
  if (!_keepAnimating) return; // stop updating when transition complete

  const dt = clock.getDelta(); // segundos
  const elapsed = clock.getElapsedTime(); // segundos totales desde inicio

  // cálculo de la rampa de aceleración (ease-in power)
  const t = Math.min(elapsed / ACCEL_DURATION, 1.0);
  const eased = Math.pow(t, ACCEL_POWER); // t^4 por defecto (acelera más al final)
  const accelFactor = START_SPEED_FACTOR + (1.0 - START_SPEED_FACTOR) * eased;
  const currentSpeed = SPEED * accelFactor;

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const pos = posAttr.array as Float32Array;

  for (let i = 0; i < STAR_COUNT; i++) {
    let z = pos[i * 3 + 2];
    z += currentSpeed * dt;

    // Si pasa la posición de la cámara, lo mandamos al fondo
    if (z > camera.position.z) {
      z = Z_FAR + Math.random() * (Z_NEAR - Z_FAR);
      // Re-random X/Y pero respetando el centro despejado
      let nx: number, ny: number;
      do {
        nx = (Math.random() * 2 - 1) * innerWidth;
        ny = (Math.random() * 2 - 1) * innerHeight;
      } while (Math.hypot(nx, ny) < CENTRAL_CLEAR_RADIUS);
      pos[i * 3 + 0] = nx;
      pos[i * 3 + 1] = ny;
    }

    pos[i * 3 + 2] = z;
  }

  posAttr.needsUpdate = true;

  // actualizar UI con velocidad actual y progreso de iluminación
  const lightPct = elapsed >= ACCEL_DURATION ? Math.min((elapsed - ACCEL_DURATION) / LIGHT_FADE_DURATION, 1.0) * 100 : 0;
  // diagnostic info removed per user request

  // cuando la rampa termina, hacemos fade-in del overlay blanco (solo después de 6s)
  if (elapsed > ACCEL_DURATION) {
    const lightT = Math.min((elapsed - ACCEL_DURATION) / LIGHT_FADE_DURATION, 1.0);
    overlay.style.opacity = String(lightT * MAX_LIGHT_OPACITY);
  } else {
    overlay.style.opacity = '0';
  }
  // Si la rampa terminó, marcamos la transición como hecha y detenemos la animación
  if (t >= 1.0 && !_transitionStarted) {
    _transitionStarted = true;
    // Stop updating to keep the final visual state (avoid loading any Part 3)
    _keepAnimating = false;
    try { renderer.domElement.style.transition = 'opacity 0.45s ease'; renderer.domElement.style.opacity = '0'; } catch (e) {}
  }

  // --- Efecto visual de estiramiento y blur basado en la rampa de aceleración ---
  // Usamos 'eased' (0..1) para controlar la intensidad visual
  const stretch = eased * STRETCH_MAX;
  const sx = 1 + stretch * STRETCH_AXIS_FACTOR; // leve expansión en X (hacia afuera)
  const sy = 1 + stretch; // estiramiento en Y
  renderer.domElement.style.transform = `scale(${sx}, ${sy})`;

  // --- Glow central: hacer que aparezca a partir de GLOW_APPEAR_SPEED y crezca hasta GLOW_FULL_SPEED ---
  // raw in 0..1 where 0 => at/below appear speed, 1 => at/full speed
  const denom = Math.max(0.0001, GLOW_FULL_SPEED - GLOW_APPEAR_SPEED);
  const raw = Math.min(Math.max((currentSpeed - GLOW_APPEAR_SPEED) / denom, 0), 1);
  const easedGlow = Math.pow(raw, GLOW_GROWTH_POWER);

  // escala objetivo: del base hasta cubrir pantalla (maxDim * factor)
  const maxDim = Math.max(innerWidth, innerHeight);
  const targetScale = maxDim * GLOW_MAX_SCALE_FACTOR;
  const newScale = THREE.MathUtils.lerp(GLOW_BASE_SCALE, targetScale, easedGlow);
  // aplicar un pequeño titileo (flicker) en opacidad y escala
  const time = elapsed;
  // Hacer que el titileo también responda a la rampa de aceleración general (eased)
  const flickControl = Math.max(eased, easedGlow);
  const flicker = Math.sin(time * GLOW_FLICKER_FREQ + glowFlickerPhase) * GLOW_FLICKER_AMPLITUDE * flickControl;
  const scaleFlicker = 1 + Math.sin(time * (GLOW_FLICKER_FREQ * 0.9) + glowFlickerPhase) * 0.012 * flickControl;

  glow.scale.set(newScale * scaleFlicker, newScale * scaleFlicker, 1);

  // opacidad del glow mezcla entre base y máxima, más el flicker (clamp)
  const newOpacity = THREE.MathUtils.lerp(GLOW_BASE_OPACITY, GLOW_MAX_OPACITY, easedGlow);
  const finalOpacity = THREE.MathUtils.clamp(newOpacity + flicker, 0, GLOW_MAX_OPACITY);
  (glow.material as THREE.SpriteMaterial).opacity = finalOpacity;

  // si el glow está creciendo, evitar que el overlay blanco lo tape (reducción suave)
  if (raw > 0) {
    // reducir overlay en función del easedGlow
    const overlayOpacity = parseFloat(overlay.style.opacity || '0');
    overlay.style.opacity = String(Math.max(0, overlayOpacity * (1 - easedGlow)));
    // poner glow justo delante de la cámara para que cubra la pantalla cuando sea grande
    glow.position.set(0, 0, camera.position.z - 1);
    // ocultar debugSphere para que no lo oculte
    debugSphere.visible = false;
  } else {
    // volver a posición original si el glow no está activo
    glow.position.set(0, 0, 0);
    debugSphere.visible = true;
  }

  // --- Pulsado del glow en el texto del título inferior ---
  try {
    const enteringBlack = document.querySelector('.entering-black') as HTMLElement | null;
    const enteringGray = document.querySelector('.entering-gray') as HTMLElement | null;
    if (enteringBlack && enteringGray) {
      // control de titileo: usar la misma base que para el glow (eased y easedGlow)
      const flickControl = Math.max(eased, easedGlow);
      const textFlick = Math.abs(Math.sin(elapsed * GLOW_FLICKER_FREQ + glowFlickerPhase)) * GLOW_FLICKER_AMPLITUDE * flickControl;
      const textGlowBlur = 6 + easedGlow * 22 + textFlick * 24;
      const textGlowAlpha = Math.min(1, 0.28 + easedGlow * 0.72 + textFlick * 0.6);

      const blackShadow = `-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, 0 0 ${textGlowBlur}px rgba(255,230,120,${textGlowAlpha}), 0 0 ${textGlowBlur * 1.6}px rgba(255,200,90,${textGlowAlpha * 0.45})`;
      enteringBlack.style.textShadow = blackShadow;

      const grayGlowBlur = Math.max(4, textGlowBlur * 0.85);
      const grayGlowAlpha = Math.min(1, textGlowAlpha * 0.85);
      const grayShadow = `-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, 0 0 ${grayGlowBlur}px rgba(255,230,120,${grayGlowAlpha}), 0 0 ${grayGlowBlur * 1.2}px rgba(255,200,90,${grayGlowAlpha * 0.35})`;
      enteringGray.style.textShadow = grayShadow;
    }
  } catch (e) {
    // no crash if DOM not ready
  }

  renderer.render(scene, camera);

}

// Exported starter: wraps the existing setup and returns a Promise that
// resolves when the warp transition finishes.
export function startWarp(): Promise<void> {
  return new Promise((resolve) => {
    // reset clock and flags
    clock.start();
    clock.getDelta();
    _keepAnimating = true;
    _transitionStarted = false;
    // start loop
    animate();

    // Listen for the moment we mark the transition started and then resolve
    // after a short delay to allow final fades/transitions.
    const originalCheck = function checkLoop() {
      if (_transitionStarted) {
        // wait a bit to allow CSS transitions to finish (matches renderer opacity change)
        setTimeout(() => {
          try {
            window.dispatchEvent(new CustomEvent('part2:done'));
          } catch (e) {}
          resolve();
        }, 700);
      } else {
        requestAnimationFrame(originalCheck);
      }
    };
    requestAnimationFrame(originalCheck);
  });
}

// Manejo de resize
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Export some handles for debugging desde consola (opcional)
// @ts-expect-error attaching for quick debug
window.__SCENE = { scene, camera, renderer, points };

function safeDisposeTexture(t: any) {
  try {
    if (!t) return
    if (t.dispose) t.dispose()
    // older three exposures
    if (t.image) t.image = null
  } catch (e) {}
}

function disposePart2() {
  // stop rafs
  try {
    if (_rafId) cancelAnimationFrame(_rafId)
  } catch (e) {}
  _rafId = null

  // stop update loop
  _keepAnimating = false

  // remove renderer canvas from DOM
  try {
    if (renderer && renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
  } catch (e) {}

  // dispose renderer and force context loss if available
  try {
    ;(renderer as any).forceContextLoss && (renderer as any).forceContextLoss()
  } catch (e) {}
  try { renderer.dispose && renderer.dispose() } catch (e) {}

  // traverse scene and dispose geometries, materials and textures
  try {
    scene.traverse((obj: any) => {
      try {
        if (obj.geometry) {
          if (obj.geometry.dispose) obj.geometry.dispose()
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((mat: any) => {
            if (!mat) return
            // dispose textures on material
            ['map','alphaMap','aoMap','bumpMap','normalMap','roughnessMap','metalnessMap','emissiveMap','envMap'].forEach((k) => {
              if (mat[k]) safeDisposeTexture(mat[k])
            })
            if (mat.dispose) mat.dispose()
          })
        }
      } catch (e) {}
    })
  } catch (e) {}

  // dispose points geometry/material explicitly
  try { geometry.dispose && geometry.dispose() } catch (e) {}
  try { (material as any).dispose && (material as any).dispose() } catch (e) {}

  // remove helper DOM nodes to avoid leaking listeners/styles
  try { entering && entering.remove && entering.remove() } catch (e) {}
  try { overlay && overlay.remove && overlay.remove() } catch (e) {}
  // keep transitionOverlay removal to original flow

  // clear debug handle
  try { (window as any).__SCENE = null } catch (e) {}
}

// expose dispose helper so the orchestrator can call it when switching to Part3
try {
  (window as any).disposePart2 = disposePart2;
} catch (e) {}
