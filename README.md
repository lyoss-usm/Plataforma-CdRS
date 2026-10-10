# Plataforma Club de Rol Sansano ![](https://img.shields.io/badge/estado-activo-green) ![](https://img.shields.io/github/license/lyoss-usm/Plataforma-CdRS)

Este repositorio es para el **Sistema de Gestion de Prestamos e Inventario** diseñado para el *Club de Rol Sansano*. Contempla tanto una plataforma administrativa como un portal web abierto al publico, enfocandose en el **perfomance** y **UI/UX**.


## Seguimiento
- Puedes seguir el progreso del proyecto en [GitHub Projects](https://github.com/orgs/lyoss-usm/projects/18).
- Para reportar problemas o sugerencias, visita [GitHub Issues](https://github.com/lyoss-usm/Plataforma-CdRS/issues).
- Documentación adicional disponible en [GitHub Wiki](https://github.com/lyoss-usm/Plataforma-CdRS/wiki).

## Requisitos
- [Node.js](https://nodejs.org/en) (>= 22.x)
- [pnpm](https://pnpm.io/es/) (>= 10.x)
- [Make](https://www.gnu.org/software/make/) (>= 4.x)

## Quick Start
1. Clona este repositorio:
   ```bash
   git clone https://github.com/lyoss-usm/Plataforma-CdRS.git
   ```
2. Navega al directorio del proyecto:
   ```bash
   cd Plataforma-CdRS
   ```
3. Instala las dependencias y configura el entorno:
   ```bash
   make init
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   make start
   ```
5. Abre tu navegador y visita [http://localhost:5173/](http://localhost:5173/) para ver el sitio web en acción.

> [!TIP]
> Para ver mas comandos disponibles, ejecuta:
> ```bash
> make help
> ```

## Panel administrativo y autenticación

`/admin/*` exige una sesión de staff (Supabase Auth, solo por invitación) y cada operación se
valida con políticas RLS en la base de datos. Para desarrollo local, `supabase db reset` carga
tres cuentas de prueba (contraseña `cdrs-dev`):

| Correo | Cargo |
|---|---|
| `dev.junior@usm.cl` | Junior |
| `dev.senior@usm.cl` | Senior |
| `dev.directivo@usm.cl` | Directivo |
| `dev.comun@usm.cl` | Ninguno (cuenta sin acceso al panel) |

Ingresa en [http://localhost:5173/login](http://localhost:5173/login). Si tu base local es
anterior a esta configuración, ejecuta `make reset-seed` para aplicar las migraciones y crear las
cuentas. Para comprobar las restricciones por rol (sin cargo, Junior, Senior, Directivo) hay tres
capas de pruebas, todas contra Supabase local: `make test-db` (RLS en SQL), `make test-auth` (API de
Supabase y servidor web, requiere `.env`) y `make test-security` (ambas). Si cambias
`supabase/config.toml`, reinicia Supabase (`make stop` y luego `pnpx supabase start`) para que Auth lo aplique.

## Documentación de la API

Con el servidor de desarrollo en ejecución, la documentación interactiva está disponible en:

- [Swagger UI](http://localhost:5173/docs/api)
- [Contrato OpenAPI](http://localhost:5173/openapi.yaml)

El contrato fuente se encuentra en [`static/openapi.yaml`](static/openapi.yaml). Al agregar o modificar endpoints, este archivo debe actualizarse para mantener la documentación sincronizada con la implementación.