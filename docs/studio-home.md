# Destacado del Home: logos y selección variable

El Home de Studio pide hasta ocho películas aleatorias de la biblioteca accesible
al usuario. La selección se renueva al volver a montar el Home; no se limita a
las últimas películas añadidas ni utiliza un catálogo de recomendaciones externo.

Cuando Jellyfin ya tiene una imagen de tipo Logo para la película, se usa esa
imagen con su tag de caché. Si no existe, se consultan los proveedores de imágenes
del servidor para esa película y se descarga el logo disponible al mostrarlo.
Esto utiliza la identificación existente de la película, sin buscar solo por
nombre. Los proveedores disponibles (por ejemplo TMDb) deben tener la película
correctamente identificada y conexión a Internet. Se consideran otros idiomas
cuando sea necesario. Sin resultados, ante un error de red o si la imagen falla,
se conserva el título legible.

La consulta de logos remotos se guarda en caché durante 24 horas y solo se realiza
para la película activa. La imagen la descarga y almacena en caché el navegador;
abrir el Home no modifica los archivos ni los metadatos de la biblioteca. El Home
no requiere que cada usuario tenga permisos de edición de imágenes.

El destacado avanza cada 10 segundos. Las flechas y los indicadores permiten
cambiar manualmente; el botón de pausa detiene la rotación. Se pausa mientras se
interactúa con los controles, durante el foco de teclado, cuando la pestaña está
oculta o se está iniciando la reproducción. Con movimiento reducido solicitado
por el sistema, comienza pausado. Una biblioteca con una sola película no gira y
una biblioteca vacía conserva el estado original de Jellyfin.

## Validación

- TypeScript, ESLint y Stylelint sobre los archivos modificados.
- Suite del cliente: 187 pruebas en 15 archivos, incluidas descarga de logos,
  alternativa textual, selección aleatoria, avance, pausa, foco, pestaña oculta y
  movimiento reducido.
- Compilación de producción y comprobación real en Chromium de descarga del logo,
  avance automático y pausa, además de ajuste móvil sin desbordamiento.
- Prueba de proveedor real: logo de TMDb para Fight Club (TMDb 550), solicitado
  por Jellyfin. El archivo de vídeo usado es una muestra sintética de la instancia
  aislada; no se afirma haber probado la película comercial ni la biblioteca de
  Unraid.

[Logo descargado del proveedor en escritorio](screenshots/home-provider-logo-1600.png) ·
[Versión móvil](screenshots/home-provider-logo-390.png)
