# Navegación común de Studio

La barra autenticada de Studio comparte una sola composición (`StudioToolbar`)
entre Inicio, bibliotecas, preferencias y administración. El conjunto de marca, menú y controles está centrado en un contenedor de
ancho máximo de 1280 px; por debajo ocupa el ancho disponible. La marca ocupa un ancho
fijo: cambiar el nombre del servidor, abrir administración o mostrar su sidebar no
mueve Inicio, Explorar, Canales ni Descubrir. Administración conserva su sidebar y
sus enlaces, sin repetir la marca dentro del drawer.

La barra completa permanece transparente al desplazarse. El desenfoque y el borde
translúcido se aplican únicamente a la cápsula de navegación, búsqueda y controles.
La selección superior usa blanco translúcido neutro; se conservan los colores de
marca, acciones y estados del resto del producto. Ajustes y avatar tienen controles
circulares de 44 px con hover oscuro, foco visible y reducción de movimiento.

En pantallas de hasta 900 px la barra se distribuye en dos filas y muestra solo el
símbolo de la marca. El espacio del botón lateral se reserva incluso en páginas
sin drawer, donde queda oculto y deshabilitado. La altura real de la barra se mide
con ResizeObserver y se comparte mediante `--studio-header-height`; el drawer
administrativo comienza debajo. Se mantiene el Home de ancho completo y su
espaciado existente.

Búsqueda, reproducción remota, SyncPlay y menú de usuario utilizan los componentes
existentes. La reproducción de vídeo no muestra esta barra. Las páginas públicas
y los temas distintos de Studio conservan la composición original.

## Capturas reales

Capturas de Chromium con la compilación de producción, en una instancia aislada
con usuario sintético. Las capturas muestran una
biblioteca sintética de revisión; no se incluyen credenciales, tokens ni contenido de la instancia
principal. La captura de vídeo usa un patrón audiovisual generado localmente.

- [Inicio centrado, 1920 px](screenshots/navigation-home-1920.png)
- [Inicio, 1600 px](screenshots/navigation-home-1600.png)
- [Preferencias, 1600 px](screenshots/navigation-studio-preferences-1600.png)
- [Administración, 1600 px](screenshots/navigation-dashboard-1600.png)
- [Inicio, 390 px](screenshots/navigation-home-390.png)
- [Administración, 390 px](screenshots/navigation-dashboard-390.png)
- [Reproducción sin barra superior](screenshots/navigation-video-1600.png)

## Verificación de la reconstrucción

Se reconstruyó el comportamiento sobre `ab62406e08a322967669ac64d82c0702fb0ef5f3`.
El identificador perdido `ae92ff7` no estaba en el checkout ni disponible como
referencia remota; no se presupone que su objeto esté publicado en GitHub.

Con Node 24 y npm 11, activados mediante `source scripts/env.sh`:

```bash
cd web
npm run build:check
npm test
npm run build:production
npx eslint src/components/studio/StudioToolbar.tsx src/components/OffsetAppBar.tsx \
  src/components/toolbar/AppToolbar.tsx src/components/toolbar/UserMenuButton.tsx \
  src/apps/modern/components/AppToolbar/index.tsx src/apps/dashboard/AppLayout.tsx \
  src/apps/dashboard/components/drawer/StudioAdminDrawer.tsx
npx stylelint src/components/studio/studioToolbar.scss \
  src/components/studio/studioPages.scss src/themes/studio/theme.scss
```

TypeScript, ESLint y Stylelint pasaron. Vitest ejecutó 180 pruebas en 15 archivos,
sin fallos. La compilación de producción terminó con dos advertencias de tamaño
de assets/entrypoints, sin errores.

En Chromium se comprobaron `/home`, `/studio/browse`, `/studio/discover`,
`/studio/preferences`, `/dashboard`, `/dashboard/settings`, `/dashboard/networking`
y `/dashboard/health` en 2560×1000, 1920×1000, 1600×1000, 390×1000, 360×1000 y
320×1000, esperando la ruta,
el layout y una geometría estable antes de medir:

| Ancho | Menú x | Menú y | Altura |
| --- | --- | --- | --- |
| 2560 | 848 | 16 | 44 |
| 1920 | 528 | 16 | 44 |
| 1600 | 368 | 16 | 44 |
| 390 | 96 | 12 | 40 |
| 360 | 90 | 12 | 40 |
| 320 | 90 | 12 | 40 |

Las 48 combinaciones conservaron la posición entre páginas, sin desbordamiento
horizontal. Se verificaron transparencia, ausencia de desenfoque y sombra en el
contenedor, engranaje de 44×44 px con radio 50%, fondo normal
`rgba(9,15,20,0.26)` y hover `rgba(4,9,13,0.4)`, y apertura del drawer móvil.
Para las páginas vacías se añadió altura solo al DOM de prueba para comprobar la
posición fija tras desplazamiento. También se comprobó búsqueda, acceso a ajustes
y avatar en 320 px, conservación de la barra original en Dark y ausencia de la
barra autenticada en login. Se reprodujo el vídeo sintético y se comprobó que la
barra Studio no se superpone al reproductor.

No se modificaron cuentas ni bibliotecas en la instancia principal. Los datos de
la instancia de revisión permanecen en `.local/nav-review/`, ignorado por Git.

También se verificó el desplazamiento real de 800 px del formulario de Red a
1600×1000, conservando la barra transparente y el menú en y=16. Los menús de
SyncPlay y reproducción remota abrieron correctamente. La revisión incluye foco
de teclado visible y transiciones desactivadas con `prefers-reduced-motion`.
