# Dashboard unificado de Studio

La entrada **Dashboard**, en inglés, reúne las antiguas opciones Panel, Salud del
servidor, Actividad y Dispositivos de la navegación de Studio. Su primera pantalla
es un monitor con tarjetas oscuras, bordes discretos y gráficas de CPU, red y
memoria, contador de streams y almacenamiento por volumen, siguiendo la
composición de la referencia proporcionada.

Al bajar con la rueda aparece **Servidor y actividad**, con todos los widgets
originales: información del servidor, escaneo/reinicio/apagado con sus
confirmaciones, recuentos de biblioteca, tareas, dispositivos, actividad, alertas
y rutas. Las tablas completas de actividad y gestión de dispositivos siguen
accesibles desde los widgets y mantienen Dashboard seleccionado en el menú.
No se eliminan sus filtros ni acciones de administración.

La antigua dirección `/dashboard/health` redirige a `/dashboard`. La búsqueda de
ajustes envía las consultas de salud, actividad y dispositivos a la entrada
unificada. Los demás temas conservan el panel nativo.

## Métricas y alcance

- **CPU y memoria** conservan los valores de `Studio/Health`: corresponden al
  proceso Jellyfin. La memoria disponible y el número de CPU dependen del entorno
  y de sus límites; no se presentan como uso completo del host Unraid ni como un
  desglose de CPU de FFmpeg o utilización de GPU.
- **Red** usa contadores reales de las interfaces activas visibles por Jellyfin,
  excluyendo loopback. Es tráfico agregado de esas interfaces, no tráfico medido
  exclusivamente del proceso Jellyfin. El cliente necesita dos lecturas para
  calcular Mbps según el tiempo realmente transcurrido. Un reinicio de contadores,
  un intervalo inválido o una plataforma sin métricas no se convierten en un cero
  ficticio.
- **Streams** distingue los métodos informados por las sesiones: transcode,
  direct play y direct stream. Una sesión sin método se identifica como tal.
- **Almacenamiento** utiliza la capacidad y espacio libre del sistema de archivos.
  Datos, caché, transcodificación y bibliotecas del mismo DeviceId se agrupan sin
  sumar repetidamente la capacidad del disco. Si falta la identidad del volumen,
  las rutas se mantienen separadas y se etiquetan como ubicaciones.
- **Escaneo y codificación** muestran el estado real de la tarea y la configuración
  de aceleración. La configuración no se confunde con una medición de uso de GPU.

El historial contiene hasta cinco minutos de muestras recibidas durante esta
visita, con actualización cada cinco segundos y almacenamiento cada treinta.
No se dibuja historia anterior a la visita ni se ofrecen rangos 1h/24h/7d sin datos
persistidos. **Live** permite pausar/reanudar el sondeo del monitor. Los valores
pendientes o no disponibles se distinguen de valores reales iguales a cero.

El endpoint ampliado conserva la autorización administrativa. Si las métricas de
red no están disponibles, CPU y memoria siguen respondiendo. No se modifica la
configuración ni se crean cuentas o bibliotecas al abrir el Dashboard.

## Validación

- Cliente: TypeScript, ESLint y Stylelint sin errores. Los widgets heredados
  conservan los avisos de deprecación de MUI Grid.
- 208 pruebas del cliente en 21 archivos: cálculo de Mbps, contador reiniciado,
  muestras ausentes, ventana temporal, agrupación de almacenamiento, pausa,
  errores, permisos y navegación unificada.
- Servidor: compilación .NET sin errores ni advertencias y 30 pruebas de
  Jellyfin.Common.Tests aprobadas.
- Peticiones reales a Studio/Health: CPU y memoria válidas, contadores de red
  crecientes tras tráfico real y acceso anónimo rechazado.
- Chromium en 1920, 1600, 999, 390 y 320 px: lecturas y gráficas reales, pausa,
  scroll al panel original, navegación única, drawer móvil accesible, ausencia de
  desbordamiento horizontal y redirección de la antigua ruta de salud. Se abre y
  cancela la confirmación nativa de reinicio sin reiniciar el servidor.

Las capturas y datos de validación proceden de una instancia aislada. No se han
alterado cuentas, bibliotecas ni servicios del servidor Unraid del usuario.

[Dashboard en escritorio](screenshots/dashboard-health-1920.png) ·
[Dashboard móvil](screenshots/dashboard-health-390.png) ·
[Panel original al bajar](screenshots/dashboard-original-panel-1920.png)
