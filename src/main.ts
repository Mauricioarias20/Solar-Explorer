const video = document.getElementById('bg-video') as HTMLVideoElement | null;
const image = document.getElementById('bg-image') as HTMLImageElement | null;
const toggleBtn = document.getElementById('toggle-mode') as HTMLButtonElement | null;
const audio = document.getElementById('bg-audio') as HTMLAudioElement | null;
const audioToggle = document.getElementById('audio-toggle') as HTMLButtonElement | null;
const audioVolume = document.getElementById('audio-volume') as HTMLInputElement | null;
const audioMute = document.getElementById('audio-mute') as HTMLButtonElement | null;
const musicControls = document.getElementById('music-controls') as HTMLElement | null;

let staticMode = false;

// Utility to guard elements
function get<T>(el: T | null, name: string): T {
  if (!el) throw new Error(`Elemento requerido no encontrado: ${name}`);
  return el;
}

// Toggle video / imagen
const tBtn = get(toggleBtn, 'toggle-mode');
tBtn.addEventListener('click', () => {
  staticMode = !staticMode;
    if (staticMode) {
    // show image, pause video
    if (image) image.hidden = false;
    if (video) {
      video.pause();
    }
    tBtn.textContent = 'Video mode';
  } else {
    // return to video
    if (video) {
      video.play().catch(() => {});
    }
    if (image) image.hidden = true;
    tBtn.textContent = 'Static mode';
  }
});

// Removed: 'change-media' button and handler (no longer needed)

// Audio control: autoplay attempt, then toggle mute; show volume slider when playing
const aToggle = get(audioToggle, 'audio-toggle');
function showVolume() {
  if (!audioVolume) return;
  audioVolume.hidden = false;
}
 

function hideVolume() {
  if (!audioVolume) return;
  audioVolume.hidden = true;
}

// Restore stored settings
const storedVol = typeof window !== 'undefined' ? localStorage.getItem('bg-audio-volume') : null;
const storedMuted = typeof window !== 'undefined' ? localStorage.getItem('bg-audio-muted') : null;

aToggle.addEventListener('click', async () => {
  // Toggle visibility of the config panel
  if (!musicControls) return;
  musicControls.hidden = !musicControls.hidden;
  // Update mute button text to reflect current state
  if (audioMute && audio) audioMute.textContent = audio.muted ? 'Unmute music' : 'Mute music';
});

// Volume slider handler
if (audioVolume) {
  audioVolume.addEventListener('input', () => {
    if (!audio) return;
    const v = Number(audioVolume.value) / 100;
    audio.volume = v;
    try { localStorage.setItem('bg-audio-volume', audioVolume.value); } catch {}
  });
}

// Mute button handler inside the config panel
if (audioMute) {
  audioMute.addEventListener('click', () => {
    if (!audio) return;
    audio.muted = !audio.muted;
    audioMute.textContent = audio.muted ? 'Unmute music' : 'Mute music';
    try { localStorage.setItem('bg-audio-muted', audio.muted ? '1' : '0'); } catch {}
  });
}

// Removed: mute checkbox handler (video has no audio)

// Al cargar: asegurar fuentes locales y evitar logs repetitivos
let videoInit = false;
let audioErrorCount = 0;
let imageErrorCount = 0;
const MAX_ERROR_LOGS = 3;
const VIDEO_SRC = new URL('./assets/video/Esta_es_una_202512150833.mp4', import.meta.url).href;
const AUDIO_SRC = new URL('./assets/audio/bg-music.mp3', import.meta.url).href;
const IMAGE_SRC = new URL('./assets/images/bg-photo.jpg', import.meta.url).href;

window.addEventListener('load', () => {
  // Video: asignar solo si no está inicializado
  if (video && !videoInit) {
    videoInit = true;
    try {
      if (video.src !== VIDEO_SRC) {
        video.src = VIDEO_SRC;
        video.load();
      }

      video.play().catch(() => {
        // Autoplay bloqueado: loguear solo una vez
        if (!(window as any).__videoPlayAttempted) {
          console.debug('Intento de autoplay del video bloqueado (espera interacción del usuario).');
          (window as any).__videoPlayAttempted = true;
        }
      });

      console.debug('Video source set to:', video.src);

      video.addEventListener('error', () => {
        const c = ((video as any).__errorCount = ((video as any).__errorCount || 0) + 1);
        if (c <= MAX_ERROR_LOGS) console.error('Error cargando video:', video.src, video.error);
        else if (c === MAX_ERROR_LOGS + 1) console.warn('Se han suprimido más errores de video para evitar spam.');
      });
    } catch (err) {
      console.warn('No se pudo asignar la fuente del video', err);
    }
  }

  // Audio: evitar múltiples errores
  if (audio) {
    try {
      if (audio.src !== AUDIO_SRC) {
        audio.src = AUDIO_SRC;
        audio.load();
      }
      audio.volume = 0.5;

      const audioErrorHandler = (e: Event) => {
        audioErrorCount++;
        if (audioErrorCount <= MAX_ERROR_LOGS) console.error('Error cargando audio:', e);
        else if (audioErrorCount === MAX_ERROR_LOGS + 1) console.warn('Se han suprimido más errores de audio para evitar spam.');
        if (audioErrorCount > MAX_ERROR_LOGS) {
          try { audio.pause(); } catch {}
        }
      };

      let audioReadyLogged = false;
      audio.addEventListener('canplay', () => {
        if (!audioReadyLogged) {
          console.debug('Audio listo para reproducir');
          audioReadyLogged = true;
        }
      });
      audio.addEventListener('error', audioErrorHandler);
      audio.addEventListener('loadstart', () => console.debug('Audio load started'));
    } catch (err) {
      console.warn('No se pudo asignar la fuente del audio', err);
    }
  }

  // Attempt to autoplay audio (best-effort). Many browsers block audible autoplay.
  if (audio) {
    (async () => {
      try {
        await audio.play();
        // autoplay succeeded with sound
        console.debug('Autoplay succeeded with sound');
        if (audioMute) audioMute.textContent = audio.muted ? 'Unmute music' : 'Mute music';
        // Ensure stored volume is applied
        if (audioVolume && storedVol) audioVolume.value = storedVol;
      } catch (err) {
        console.debug('Audible autoplay blocked, trying muted autoplay...', err);
        try {
          audio.muted = true;
          await audio.play();
          console.debug('Muted autoplay allowed; audio is playing silently.');
          if (audioMute) audioMute.textContent = 'Unmute music';
          if (audioVolume && storedVol) audioVolume.value = storedVol;
        } catch (err2) {
          console.debug('Autoplay fully blocked; user interaction required to start audio.', err2);
          // Leave button as-is; user can click to open the config and start playback manually.
          hideVolume();
        }
      }
    })();
  }

  // Image: controlar errores y evitar spam
  if (image) {
    try {
      if (image.src !== IMAGE_SRC) image.src = IMAGE_SRC;

      const imageLoadHandler = () => {
        console.debug('Imagen cargada:', image.src, 'naturalWidth=', image.naturalWidth);
        image.removeEventListener('load', imageLoadHandler);
      };

      const imageErrorHandler = (e: Event) => {
        imageErrorCount++;
        if (imageErrorCount <= MAX_ERROR_LOGS) console.error('Error cargando imagen:', image.src, e);
        else if (imageErrorCount === MAX_ERROR_LOGS + 1) console.warn('Se han suprimido más errores de imagen para evitar spam.');
        if (imageErrorCount > MAX_ERROR_LOGS) {
          image.removeEventListener('error', imageErrorHandler);
          image.src = new URL('./assets/images/placeholder.svg', import.meta.url).href;
        }
      };

      // Loader handling: ensure overlay disappears after media ready (min 2s)
      const loader = document.getElementById('loader') as HTMLElement | null;
      const MIN_LOADER_SHOW = 2000;
      let loaderTimeout: number | null = null;
      const loaderShownAt = Date.now();
      function hideLoader() {
        if (!loader) return;
        if (loader.hasAttribute('hidden')) return;
        const elapsed = Date.now() - loaderShownAt;
        if (elapsed < MIN_LOADER_SHOW) {
          const remaining = MIN_LOADER_SHOW - elapsed;
          if (loaderTimeout) window.clearTimeout(loaderTimeout as any);
          loaderTimeout = window.setTimeout(hideLoader, remaining);
          return;
        }
        loader.setAttribute('hidden', '');
        try { loader.setAttribute('aria-hidden', 'true'); } catch {}
        if (loaderTimeout) { window.clearTimeout(loaderTimeout as any); loaderTimeout = null; }
      }

      image.addEventListener('load', () => { imageLoadHandler(); hideLoader(); });
      image.addEventListener('error', (e) => { imageErrorHandler(e); hideLoader(); });

      // Hide loader when video is ready or starts playing
      if (video) {
        video.addEventListener('canplay', hideLoader, { once: true });
        video.addEventListener('playing', hideLoader, { once: true });
      }

      // fallback: ensure it hides after MIN_LOADER_SHOW ms
      if (loader) loaderTimeout = window.setTimeout(hideLoader, MIN_LOADER_SHOW);

      if (image.complete && image.naturalWidth > 0) {
        console.debug('Imagen ya estaba cargada:', image.src);
        hideLoader();
      }

      // --- Scroll-in (zoom + fade) behavior ---
      let scrollInDone = false;
      let scrollInInProgress = false;
      const SCROLL_TRIGGER_THRESHOLD = 8; // wheel delta threshold
      const SCROLL_DURATION = 1100; // ms, should match CSS (increased for stronger zoom + fade)

      function startScrollIn() {
        if (scrollInDone || scrollInInProgress) return;
        scrollInInProgress = true;
        try { document.body.classList.add('scroll-in'); } catch {}
        // prevent default scrolling while animating
        try { document.body.style.overflow = 'hidden'; } catch {}

        window.setTimeout(() => {
          scrollInDone = true;
          scrollInInProgress = false;
          try { document.body.classList.add('scroll-in-complete'); } catch {}
          // Ensure background stays black
          try { document.body.style.background = '#000'; } catch {}

          // Fade out the video gradually and then pause/hide it
          const vid = document.getElementById('bg-video') as HTMLVideoElement | null;
          if (vid) {
            try {
              vid.style.transition = `opacity ${SCROLL_DURATION}ms ease`;
              vid.style.opacity = '0';
            } catch {}
            window.setTimeout(() => {
              try { vid.pause(); vid.hidden = true; } catch {}
            }, SCROLL_DURATION + 60);
          }

          // Hide fallback image if present
          if (image) {
            try { image.hidden = true; } catch {}
          }

          window.dispatchEvent(new CustomEvent('scrollin:done'));
        }, SCROLL_DURATION + 40);
      }

      // If a tap happened before this script loaded, trigger the scroll-in now
      try {
        if ((window as any).__pendingScrollIn) {
          console.debug('MAIN: detected pending tap before load, triggering scroll-in');
          startScrollIn();
        }
      } catch (e) {
        // noop
      }

      // Expose startScrollIn for inline scripts and listen to a custom event
      try {
        (window as any).startScrollIn = startScrollIn;
        window.addEventListener('trigger-scrollin', () => { try { startScrollIn(); } catch (e) { console.warn('trigger-scrollin failed', e); } });

        // Also attach robust pointer/touch handlers to the center hint so taps reliably invoke the animation
        const centerHintEl = document.getElementById('center-hint') as HTMLElement | null;
        if (centerHintEl) {
          const activate = (ev: Event) => {
            try { ev.preventDefault(); (ev as any).stopPropagation(); } catch (e) {}
            try { console.debug('CENTER-HINT: pointer/touch event, invoking startScrollIn'); } catch (e) {}
            try { startScrollIn(); } catch (e) { try { (window as any).__pendingScrollIn = true; } catch(e) {} }
          };
          try {
            centerHintEl.addEventListener('pointerdown', activate as EventListener, { passive: false, capture: true, once: true });
            centerHintEl.addEventListener('touchstart', activate as EventListener, { passive: false, capture: true, once: true });
          } catch (e) {
            // fallback to click if pointer events are not supported
            try { centerHintEl.addEventListener('click', activate as EventListener, { passive: false, once: true }); } catch (e) {}
          }
        }

      } catch (e) {
        // noop
      }

      let _scrollDebugLogged = false;
      function onWheel(e: WheelEvent) {
        if (scrollInDone || scrollInInProgress) return;
        // Trigger when user scrolls "forward" (some devices report forward as negative deltaY)
        if (e.deltaY < -SCROLL_TRIGGER_THRESHOLD) {
          try { e.preventDefault(); } catch {}
          startScrollIn();
        } else if (!_scrollDebugLogged && Math.abs(e.deltaY) > SCROLL_TRIGGER_THRESHOLD) {
          // Log once to help debugging if the device uses an opposite sign
          console.debug('Wheel event detected (deltaY):', e.deltaY, '— adjust SCROLL_TRIGGER_THRESHOLD or sign if needed.');
          _scrollDebugLogged = true;
        }
      }

      window.addEventListener('wheel', onWheel, { passive: false });

      // keyboard fallback: down arrow, page down, space
      window.addEventListener('keydown', (e) => {
        if (scrollInDone || scrollInInProgress) return;
        if (['ArrowDown','PageDown'].includes(e.key) || e.key === ' ' ) {
          e.preventDefault();
          startScrollIn();
        }
      });

      // Mobile / touch support: change center hint and allow tap to trigger the scroll-in animation
      try {
        const centerHint = document.getElementById('center-hint') as HTMLElement | null;
        const isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator as any).msMaxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
        if (centerHint && isTouchDevice) {
          // Update text to be clear for touch users
          try { centerHint.textContent = '"tap to explore"'; } catch {}
          // Make it interactive on touch devices
          try {
            centerHint.style.pointerEvents = 'auto';
            centerHint.style.cursor = 'pointer';
            centerHint.setAttribute('role', 'button');
            centerHint.setAttribute('tabindex', '0');
            // Use click (works for tap) and support keyboard activation
            const onActivate = (ev: Event) => { try { ev.preventDefault(); } catch {} ; console.debug('CENTER-HINT: tapped on touch device, starting scroll-in'); startScrollIn(); };
            centerHint.addEventListener('click', onActivate, { once: true, passive: false });
            centerHint.addEventListener('keydown', (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { try { ev.preventDefault(); } catch {} ; startScrollIn(); } });
          } catch (e) {
            // noop
          }
        }
      } catch (e) {
        // noop
      }

    } catch (err) {
      console.warn('No se pudo comprobar la imagen', err);
    }
  }
});
// cleanup Part1: remove DOM nodes and stop media when transitioning to Part2
function disposePart1() {
  try {
    const vid = document.getElementById('bg-video') as HTMLVideoElement | null;
    if (vid) {
      try { vid.pause(); } catch (e) {}
      try { vid.remove && vid.remove(); } catch (e) {}
    }
    const img = document.getElementById('bg-image') as HTMLImageElement | null;
    if (img) try { img.remove && img.remove(); } catch (e) {}
    const loader = document.getElementById('loader') as HTMLElement | null;
    if (loader) try { loader.remove && loader.remove(); } catch (e) {}
    const music = document.getElementById('music-controls') as HTMLElement | null;
    if (music) try { music.remove && music.remove(); } catch (e) {}
    // stop audio
    const audio = document.getElementById('bg-audio') as HTMLAudioElement | null;
    if (audio) {
      try { audio.pause(); audio.src = ''; } catch (e) {}
      try { audio.remove && audio.remove(); } catch (e) {}
    }
    // remove other controls/buttons
    try {
      const elems = ['toggle-mode','audio-toggle','audio-mute','audio-volume'];
      elems.forEach(id => { const el = document.getElementById(id); if (el) el.remove && el.remove(); });
    } catch (e) {}
    // remove any classes/styles applied to body
    try { document.body.classList.remove('scroll-in','scroll-in-complete'); } catch (e) {}
    // additionally: hide/remove remaining visual nodes from Part1 to avoid any UI remnants
    try {
      const keepIds = new Set(['app']);
      const keepClasses = new Set(['entering']);
      const bodyChildren = Array.from(document.body.children);
      for (const ch of bodyChildren) {
        const id = ch.id || '';
        const cls = ch.className || '';
        const tag = (ch.tagName || '').toUpperCase();
        if (keepIds.has(id)) continue;
        if (keepClasses.size && cls) {
          const classList = (''+cls).split(/\s+/);
          if (classList.some(c => keepClasses.has(c))) continue;
        }
        if (tag === 'CANVAS') continue; // keep canvases (Part2 renderer)
        // safe-guard: do not remove scripts that load runtime (only hide)
        if (tag === 'SCRIPT') { (ch as HTMLElement).style.display = 'none'; continue; }
        try {
          // first try remove
          ch.remove && ch.remove();
        } catch (e) {
          // fallback: hide it
          try { (ch as HTMLElement).style.display = 'none'; } catch (e) {}
        }
      }
      // enforce neutral background
      try { document.body.style.background = '#000'; } catch (e) {}
    } catch (e) {
      console.warn('disposePart1: error removing remaining nodes', e);
    }
  } catch (e) {
    console.warn('disposePart1 error', e);
  }
}


// Orquestador: cuando la parte 1 emite 'scrollin:done', iniciamos la Parte 2
window.addEventListener('scrollin:done', async () => {
  try {
    console.debug('PART1: scrollin done — iniciando Parte 2 (warp)');

    // Import local de la copia de Part2 dentro de src/part2 y arrancarla.
    const mod = await import('./part2/main');
    let warpPromise: Promise<void> | null = null;
    if (mod && typeof mod.startWarp === 'function') {
      // Arrancamos la animación warp pero no esperamos a que termine —
      // arrancamos la carga de la Parte 3 en paralelo para que pueda renderizar mientras
      // before starting: inject a style that hides everything except the Part2 canvas
      try {
        if (!document.getElementById('hide-nonpart2-style')) {
          const s = document.createElement('style');
          s.id = 'hide-nonpart2-style';
          s.textContent = `
            /* hide only known Part1 UI elements during warp to avoid CSS leakage */
            #bg-container, #site-header, #center-hint, #ui, #loader, #music-controls, #bg-video, #bg-image { display: none !important; }
            /* show the Part2 canvas */
            #part2-canvas, canvas[data-part="part2"] { display: block !important; position:fixed !important; left:0 !important; top:0 !important; width:100% !important; height:100% !important; z-index:999 !important; }
            /* allow the Part2 '.entering' container to be visible above the canvas
               do NOT force styles on all descendants (avoid moving unrelated nodes) */
            .entering { display: inline-flex !important; position: fixed !important; left: 50% !important; transform: translateX(-50%) !important; bottom: 24px !important; z-index: 1001 !important; pointer-events: none !important; }
            /* keep transition overlay if present */
            #transition-overlay, [data-transition-overlay] { display: block !important; }
          `;
          document.head.appendChild(s);
        }
      } catch (e) {}

      warpPromise = mod.startWarp();
    } else {
      console.warn('PART1: startWarp() no encontrada en ./src/part2/main.ts — esperando evento part2:done');
    }

    // Dispose Part1 immediately so it no longer renders or consumes resources
    disposePart1();

    // NOTE: Part3 will be loaded only after Part2 finishes (see below)

    // Esperar a que la Parte 2 termine (por promesa o por evento) y luego mostrar la Parte 3
    if (warpPromise) {
      await warpPromise;
    } else {
      await new Promise<void>((resolve) => {
        const onDone = () => { window.removeEventListener('part2:done', onDone); resolve(); };
        window.addEventListener('part2:done', onDone);
        setTimeout(() => { window.removeEventListener('part2:done', onDone); resolve(); }, 10000);
      });
    }

    console.debug('PART1: Parte 2 finalizada — cargando y mostrando Parte 3 (solar-explorer)');
    // dispose Part2 (if available) before revealing Part3 to ensure no overlapping render
    try {
      const dp = (window as any).disposePart2;
      if (typeof dp === 'function') {
        try { dp(); console.debug('PART1: disposePart2() called'); } catch (e) { console.warn('PART1: disposePart2() threw', e); }
      }
    } catch (e) {}

    // Now load Part3 (JS & CSS) from /solar-dist and mount it in #app
    try {
      let appMount = document.getElementById('app') as HTMLElement | null;
      if (!appMount) {
        appMount = document.createElement('div');
        appMount.id = 'app';
        Object.assign(appMount.style, {
          position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
          zIndex: '0', pointerEvents: 'auto', opacity: '0', transition: 'opacity 0.6s ease', overflow: 'hidden'
        } as any);
        document.body.appendChild(appMount);
      }

      const res = await fetch('/solar-dist/index.html');
      if (res.ok) {
        const txt = await res.text();
        const cssMatches = Array.from(txt.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/ig));
        if (cssMatches.length) {
          for (const cm of cssMatches) {
            const href = cm[1];
            let cssPath = href.startsWith('/') ? '/solar-dist' + href : '/solar-dist/' + href.replace(/^\.\//, '');
            try {
              const cssRes = await fetch(cssPath);
              if (cssRes.ok) {
                let cssText = await cssRes.text();
                cssText = cssText.replace(/\/assets\//g, '/solar-dist/assets/');
                const style = document.createElement('style');
                style.textContent = cssText;
                document.head.appendChild(style);
              }
            } catch (e) { console.warn('PART1: error cargando CSS de Parte3', cssPath, e); }
          }
        }
        const scriptMatch = txt.match(/<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/i);
        if (scriptMatch && scriptMatch[1]) {
          let scriptPath = scriptMatch[1];
          scriptPath = scriptPath.startsWith('/') ? '/solar-dist' + scriptPath : '/solar-dist/' + scriptPath.replace(/^\.\//, '');
          try {
            const jsRes = await fetch(scriptPath);
            if (jsRes.ok) {
              let jsText = await jsRes.text();
              jsText = jsText.replace(/\/assets\//g, '/solar-dist/assets/');
              const blob = new Blob([jsText], { type: 'text/javascript' });
              const blobUrl = URL.createObjectURL(blob);
              const s = document.createElement('script');
              s.type = 'module';
              s.src = blobUrl;
              s.onload = () => console.debug('PART1: Parte 3 cargada desde blob of', scriptPath);
              s.onerror = (e) => console.error('PART1: error ejecutando Parte 3', e, scriptPath);
              document.body.appendChild(s);
            } else {
              console.warn('PART1: no se pudo fetch', scriptPath, jsRes.status);
            }
          } catch (e) { console.error('PART1: error fetching JS of Parte3', e); }
        } else {
          console.warn('PART1: no se encontró script de build en /solar-dist/index.html');
        }
      } else {
        console.warn('PART1: no se pudo fetch /solar-dist/index.html:', res.status);
      }
    } catch (e) {
      console.error('PART1: error cargando Parte 3:', e);
    }

    // remove the global hide-nonpart2 style so other UI can re-appear
    try {
      const h = document.getElementById('hide-nonpart2-style');
      if (h && h.parentNode) h.parentNode.removeChild(h);
    } catch (e) {}

    const appEl = document.getElementById('app') as HTMLElement | null;
    if (appEl) {
      appEl.style.zIndex = '0';
      appEl.style.pointerEvents = 'auto';
      appEl.style.opacity = '1';
    }

  } catch (err) {
    console.error('PART1: error iniciando Parte 2 o cargando Parte 3', err);
  }
});