# Solar Explorer (consolidated)

Proyecto que consolida tres partes: Parte1 (intro/fade), Parte2 (warp animation) y Parte3 (solar system).

Run locally

```bash
npm install
npm run dev
# open http://localhost:5173 (o el puerto que Vite asigne)
```

Notes
- Part2 sources are in `src/part2`
- Part3 build is copied to `public/solar-dist`

License: add `LICENSE` if you want to publish under an explicit license.
# Proyecto: Fondo de video / imagen y música

Instrucciones rápidas:

- Instalar dependencias: `npm install`
- Ejecutar servidor de desarrollo: `npm run dev` (abre http://localhost:5173 por defecto)
- Reemplazar los archivos multimedia en `src/assets/video/` y `src/assets/audio/` con tus ficheros.
- En `index.html` puedes cambiar las fuentes por archivos locales si lo deseas.
- TypeScript está instalado y `src/main.ts` reemplaza a `src/main.js`.

Funcionalidades añadidas:
- Video de fondo a pantalla completa (autoplay muteado para permitir reproducción automática)
- Modo estático (imagen) que se activa con el botón "Modo estático"
- Música de fondo con botón reproducir/pausar (los navegadores pueden bloquear autoplay con audio; el usuario puede hacer click para activar)
