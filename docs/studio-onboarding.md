# Interfaz Studio y configuración guiada

Studio conserva Jellyfin 12.4 y sus permisos, reproductor, bibliotecas y acceso remoto. La identidad sigue siendo Jellyfin, con el acento burdeos de Studio. Los retratos vectoriales son originales del proyecto; no utilizan personajes ni imágenes de tofa.

## Recorrido

El asistente inicial incluye bienvenida y nombre del servidor, cuenta administradora, bibliotecas, canales por género, avatar, idiomas, reproducción, acceso remoto, salud y resumen final. Los pasos opcionales se pueden omitir. **Continuar** guarda las preferencias del paso; **Más tarde** lo omite. Añadir una biblioteca y activar canales son acciones que se guardan inmediatamente.

En un servidor ya configurado se puede volver desde Administración → Asistente de configuración. Las bibliotecas usan las rutas visibles dentro del contenedor: por ejemplo `/media/peliculas`, no la ruta del host Unraid. El explorador de carpetas y el escaneo utilizan las funciones de Jellyfin.

## Navegación

- Inicio: imagen de biblioteca de borde a borde y degradado negro; controles de reproducción originales.
- Explorar: películas/series, búsqueda, género, año, valoración, vistas/favoritas/en curso, ordenación, índice alfabético y paginación.
- Descubrir: recomendaciones de Jellyfin; tendencias, cine, próximos estrenos y mejores valoradas de TMDb.
- Canales: programación personal basada en los géneros de la biblioteca.
- Avatar: historial, ajustes de usuario y cerrar sesión. No hay opción para reportar problemas.
- Engranaje: administración para usuarios autorizados; búsqueda de ajustes con Ctrl+K o Cmd+K.

## Preferencias

El idioma principal de audio/subtítulos y la reproducción del siguiente episodio se guardan en la cuenta Jellyfin. La selección de avatar se convierte en PNG y se sube como imagen de perfil, por lo que funciona en otros clientes. También se pueden subir fotos propias (máximo 5 MB).

Las acciones de introducciones, resúmenes y créditos usan los segmentos de Jellyfin: requieren un proveedor que los detecte. Estos ajustes, el tamaño de subtítulos y la calidad se guardan en este navegador, igual que sus equivalentes nativos. La calidad máxima permite hasta 150 Mbps y no obliga a reproducir un formato que el dispositivo no soporte. Se conservan los ajustes nativos para opciones adicionales.

El historial permanece en este servidor. No se añadió sincronización entre servidores. Jellyfin admite un idioma principal de audio y subtítulos; no se añadieron selectores de segundo idioma que el reproductor no pudiera respetar.

## Canales web por género

Cada usuario activa sus géneros; la selección se guarda en sus preferencias del servidor. La programación se calcula con las películas a las que ese usuario tiene acceso, ordenadas por ID, usando duración real y hora UTC. Los archivos sin duración conocida no reciben horarios inventados. Al sintonizar se reproduce el título correspondiente desde su posición actual y se prepara una cola circular de películas mediante el reproductor Jellyfin.

Estos canales son una función del cliente Studio web. No crean un sintonizador, una señal HLS compartida, ni una guía EPG para otros clientes. La biblioteca determina la programación: añadir películas cambia el ciclo. Siguen disponibles los sintonizadores y proveedores de TV en directo de Jellyfin. Los maratones de series se activan desde la sección desplegable y siguen el orden de temporada y episodio. El buscador permite localizar series en bibliotecas grandes.

## TMDb y universos

El servidor usa el proveedor TMDb ya incluido en Jellyfin y su clave configurada, con caché editorial de 30 minutos. Requiere acceso HTTPS a `api.themoviedb.org`; las imágenes requieren `image.tmdb.org`. No se descarga contenido multimedia ni se inventan valoraciones de IMDb.

Los detalles externos enlazan a IMDb cuando TMDb devuelve su identificador. Las sagas de TMDb muestran orden de estreno y distinguen los títulos disponibles de los ausentes. Las colecciones reales de Jellyfin también aparecen en las fichas, por lo que se pueden configurar universos propios, como Marvel, agrupando sus películas y series. Las colecciones de TMDb no equivalen necesariamente al universo completo ni a un orden narrativo curado.

La búsqueda de disponibilidad se hace en el servidor y se limita a la biblioteca accesible del usuario. Los perfiles con restricciones de contenido no reciben el catálogo externo; mantienen las recomendaciones de su biblioteca. Los fallos de conexión presentan un estado recuperable, sin sustituir datos por resultados ficticios.

Este producto utiliza la API de TMDb, pero TMDb no lo avala ni certifica. Los metadatos y las imágenes pertenecen a sus respectivos titulares.

## Acceso remoto y salud

Se conserva el acceso remoto de Jellyfin, sin relay ni cambios automáticos de puertos/router. El estado indica si el servidor permite conexiones remotas; no prueba accesibilidad desde Internet. Las opciones avanzadas enlazan a la configuración de red de Jellyfin.

La salud se consulta desde el onboarding o Administración → Salud del servidor. `/Studio/Health` requiere privilegios elevados y muestra CPU y memoria del **proceso Jellyfin**, con el límite de memoria comunicado por .NET. No son métricas globales del host Unraid. Las sesiones, el escaneo, el espacio libre y la configuración de aceleración proceden de Jellyfin. La aceleración configurada no se presenta como utilización ni detección efectiva de GPU.

Si se reinicia Jellyfin después de crear la cuenta administradora, la protección nativa de Jellyfin puede marcar el arranque como completado para cerrar los endpoints de configuración sin autenticación. Las opciones restantes se retoman con sesión administradora desde el asistente en Administración; no se desactiva esa protección.

## Verificación de esta entrega

- 180 pruebas web aprobadas, incluidas las de programación UTC, cambio de título, ciclo y orden de temporadas/episodios.
- Cliente de producción compilado; tipos TypeScript, ESLint y Stylelint de los archivos modificados comprobados.
- Servidor Release compilado sin advertencias ni errores.
- Onboarding inicial y asistente retomable recorridos en instancias aisladas con bibliotecas sintéticas; cuenta, avatar e idiomas guardados y cierre hacia Inicio comprobados.
- Reproducción de canales: transición real entre dos películas con el autoplay general desactivado; vista previa del maratón de una serie comprobada.
- Navegación desde fichas hacia las pantallas nuevas, filtros, menú de usuario, Ctrl+K y salud comprobados en Chromium; móvil de 390 px sin desbordamiento horizontal.
- Salud: administrador 200, usuario normal 403, petición sin sesión 401. Descubrir: perfiles restringidos 403 y petición sin sesión 401.
- El acceso de este entorno a TMDb no está habilitado: se comprobó la respuesta 503 y el estado recuperable del cliente. La consulta de estrenos reales debe verificarse desde una instalación con acceso a TMDb.

Las capturas de `docs/screenshots/` muestran datos sintéticos de prueba. Esos archivos multimedia y las cuentas de validación no se incluyen en la imagen distribuida ni se crean en instalaciones normales.

## Administración unificada

Administración utiliza ahora el mismo tema Studio que Inicio, el asistente y Salud. El menú se organiza en Vista general, Biblioteca, Personas, Tu servidor y Avanzado, conservando los accesos a opciones de biblioteca, reproducción y páginas de plugins. Las sesiones inactivas tienen tarjetas compactas; las sesiones en reproducción conservan su imagen, progreso y controles. Actividad y Rutas usan paneles con tipografía y espaciado reducidos. Las advertencias de almacenamiento conservan sus colores de estado.

Inicio elimina el espacio reservado bajo la barra transparente: el fondo comienza en el borde superior y ocupa la ventana. En móvil, la búsqueda del menú de administración permanece abierta mientras se escribe y el menú se cierra al elegir un destino.

Verificación adicional: Inicio comprobado en 1600×1000 y 390×844, con origen `(0, 0)` y ancho completo; 12 pantallas administrativas sin desbordamiento horizontal ni errores de JavaScript; dispositivos inactivos reducidos a aproximadamente 147 px; 180 pruebas web aprobadas. Capturas actualizadas en `docs/screenshots/administracion.png`, `administracion-ajustes.png` y `administracion-movil.png`.
