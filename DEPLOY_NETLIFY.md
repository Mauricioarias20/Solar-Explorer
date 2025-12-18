Despliegue en Netlify (rápido)

1. Crear un repo (GitHub/GitLab/Bitbucket) y pushear el proyecto.

2. En Netlify: "New site from Git" → conectar tu repositorio.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (Opcional) Set `NODE_VERSION` o env vars desde Site settings → Build & deploy → Environment.

3. Si usas rutas SPA y quieres fallback a `index.html`, añade en `netlify.toml` un redirect:

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

4. Después del deploy, abrir la consola del sitio en Production y verificar que `/assets/...` retorna 200. Si ves 404:
   - Revisa que `npm run build` se está ejecutando correctamente en los logs.
   - Comprueba que `dist/assets` contiene tus archivos (Vite añade hash a los nombres).

Notas:
- Ya actualicé el código para que Vite empaquete los assets (uso de `new URL(..., import.meta.url).href`) y añadí `netlify.toml`.
- Si quieres, puedo generar el PR con estos cambios o conectarme al repo para completar la integración (necesitaría acceso al repo o que lo conectes a Netlify y me pegues el URL de despliegue).
