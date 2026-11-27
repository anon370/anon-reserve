# ANON Reserva

**Reserva · Portal del cliente**

En `lanzamiento/mercado-publico`, `index.html` abre el catálogo, `ficha.html` muestra el negocio y `citas.html` reúne la reserva y el perfil. Los scripts del mismo nombre contienen sus interacciones.

## Mapa de Mercado

| Área | Código | Recurso identificado en DigitalOcean |
|---|---|---|
| Business | [anon-web-RD](https://github.com/anon370/anon-web-RD/tree/lanzamiento/mercado-publico) | `whale-app` · sitio del dueño |
| Reserva | [anon-reserve](https://github.com/anon370/anon-reserve/tree/lanzamiento/mercado-publico) | `sea-lion-app` · sitio del cliente |
| API y administración | [Anon-mercado-backend](https://github.com/anon370/Anon-mercado-backend/tree/main) | `octopus-app` · servicio web |
| Datos | PostgreSQL de Mercado | `mercado-db` · base administrada |

En `octopus-app`, el componente llamado `anon-mercado-backend` figura bajo **Jobs** y ejecuta una migración antes del despliegue. Para identificar el servidor de la API usa **Web Services → Source** y confirma el repositorio de Mercado. Consulta **Activity → Live deployment** para ver la versión activa. Este inventario recoge la configuración identificada en el proyecto el 25 de noviembre de 2026. La plataforma corporativa de ANON Tech Labs se administra por separado.
