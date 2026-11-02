# Probar Studio en Unraid

La plantilla usa una instancia independiente, puerto **8097**, datos en
`/mnt/user/appdata/jellyfin-studio` y biblioteca montada en solo lectura.
No reutilices la carpeta de configuración de tu Jellyfin actual.

## Imagen

El workflow de GitHub publica `ghcr.io/diegoshock/jellyfin-studio:12.4` y `latest` al
actualizar `main`. Espera a que termine correctamente. Si el paquete es privado,
configura la autenticación del registro en Unraid o cambia su visibilidad a
pública desde GitHub Packages. La publicación del código no garantiza por sí
sola que la imagen ya esté disponible.

También puedes construirla directamente en el servidor Unraid:

```bash
git clone https://github.com/diegoshock/jellyfin-studio.git
cd jellyfin-studio
docker build -t jellyfin-studio:local .
```

Para usar esa imagen local, cambia `Repository` en el XML por
`jellyfin-studio:local` antes de importarlo. No requiere publicar en un registro.

## Importar la plantilla

1. Descarga `jellyfin-studio.xml` de esta carpeta.
2. En la terminal de Unraid, prepara las carpetas nuevas:

   ```bash
   mkdir -p /mnt/user/appdata/jellyfin-studio/config /mnt/user/appdata/jellyfin-studio/cache
   chown 99:100 /mnt/user/appdata/jellyfin-studio/config /mnt/user/appdata/jellyfin-studio/cache
   ```

3. Copia el XML a `/boot/config/plugins/dockerMan/templates-user/my-jellyfin-studio.xml`.
4. En **Docker → Add Container**, elige **Jellyfin-Studio** en las plantillas de usuario.
5. Revisa la ruta de medios (`/mnt/user/media` es solo el valor inicial), los
   permisos de lectura para el usuario 99 y el puerto 8097. Pulsa **Apply**.
6. Abre **WebUI**, crea tu cuenta y añade la biblioteca desde `/media`.

No se activan privilegios, GPU ni dispositivos automáticamente. Para probar
aceleración Intel/AMD, añade `/dev/dri` y los grupos adecuados a tu equipo;
NVIDIA requiere el controlador y la configuración de runtime correspondientes.
Primero valida reproducción directa; después prueba transcodificación con tu
hardware y formatos reales.

## Comprobaciones

- La portada debe mostrar películas reales de la biblioteca, imagen, título y
  acciones de reproducir y detalle. Si no hay películas, se conserva el estado
  vacío original de Jellyfin.
- Comprueba los carriles de continuar viendo y contenido reciente.
- Reproduce un archivo, cambia posición, audio y subtítulos.
- Reinicia el contenedor y verifica que la cuenta y las bibliotecas persisten.
- Revisa el panel de administración y los registros si una función falla.

La plantilla es para `linux/amd64`, arquitectura habitual de Unraid. Las pruebas
locales del contenedor no sustituyen la validación en tu servidor Unraid.

## Actualizar una instalación anterior

Studio usa ahora Jellyfin Server y Jellyfin Web 12.4, con .NET 10. Se mantienen
los mismos montajes de `/config`, `/cache` y `/media` y el puerto de la plantilla.

1. Detén el contenedor y guarda una copia de su carpeta appdata antes de cambiar
   de versión: Jellyfin puede migrar la base de datos durante el arranque.
2. Usa `ghcr.io/diegoshock/jellyfin-studio:12.4` en **Repository** y actualiza el
   contenedor. Las instalaciones que usan `latest` también reciben esta base.
3. Espera a que termine el arranque y comprueba la versión en el panel de control.
4. Para volver a una versión anterior, restaura también la copia de appdata de
   esa versión, en lugar de abrir una base ya migrada con un servidor anterior.
