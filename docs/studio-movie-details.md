# Fichas de películas de Studio

Todas las películas usan la misma composición: póster vertical, título, frase
promocional, puntuaciones, año, duración, géneros, clasificación por edades,
distintivos técnicos compactos, sinopsis y acciones de reproducción. El título
original y el logo flotante no se repiten junto al título principal.

Las acciones nativas de Jellyfin (reproducir/reanudar, volver a ver, marcar como
visto, tráiler, favoritos y menú adicional) se conservan. Reanudar incluye el
tiempo restante cuando se conoce. Tráiler y otras acciones aparecen únicamente
si Jellyfin las ofrece para esa película.

Vídeo, audio y subtítulos dejan de mostrarse como selectores en la ficha. Se
conservan los controles del reproductor, donde pueden elegirse durante la
reproducción. Los datos y selecciones nativos no se destruyen al reorganizar la
pantalla. Créditos, etiquetas y enlaces siguen accesibles en el desplegable de
detalles, debajo de la cabecera y las colecciones disponibles.

## Datos disponibles, sin inventar puntuaciones

- **Crítica** usa `CriticRating`, en porcentaje.
- **Comunidad** usa `CommunityRating`, sobre 10. No se presenta como una
  puntuación de audiencia de Rotten Tomatoes: Jellyfin no proporciona ese dato
  separado en esta ficha.
- Los distintivos 4K/1080p/720p, HDR o Dolby Vision se obtienen de los datos del
  vídeo. El audio se resume con su codec y distribución de canales; Atmos solo
  se muestra si `AudioSpatialFormat` lo indica explícitamente.
- La pista de audio resumida es la predeterminada de la fuente cuando está
  identificada. Los datos ausentes se omiten; no se muestra una calidad o una
  puntuación ficticia.

El cambio se limita al tema Studio y al tipo Movie. Los demás temas mantienen
su ficha y los demás tipos de contenido mantienen su composición original.

## Validación

TypeScript, Stylelint y ESLint sin errores (el controlador heredado conserva
cinco advertencias previas). La suite del cliente ejecuta 194 pruebas en 17
archivos. Las nuevas pruebas cubren formato de duración, pistas predeterminadas,
HDR/Dolby Vision, Atmos sin inferencias, puntuaciones y ausencia de datos,
texto escapado, restauración del contenido nativo y cambio a otro tema.

La comprobación en Chromium usa tres películas sintéticas distintas y anchos de
1920, 1600, 999, 390 y 320 px: ficha común, portada desde y=0, acciones dentro de
la pantalla inicial, sin desbordamiento horizontal y sin selectores previos a la
reproducción. Se comprueba también la ficha original en Dark.

Una de las muestras contiene dos audios y un subtítulo externo: se abre una
reproducción real para verificar los menús de pistas dentro del reproductor. Las
muestras no son las películas comerciales de las capturas del usuario ni se han
modificado cuentas o bibliotecas de su instancia principal.

[Escritorio](screenshots/movie-details-studio-1920.png) ·
[Móvil](screenshots/movie-details-studio-390.png)
