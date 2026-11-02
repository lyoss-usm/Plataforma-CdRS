# Plataforma Club de Rol Sansano ![](https://img.shields.io/badge/estado-activo-green) ![](https://img.shields.io/github/license/lyoss-usm/Plataforma-CdRS)

Este repositorio es para el **Sistema de Gestion de Prestamos e Inventario** diseñado para el _Club de Rol Sansano_. Contempla tanto una plataforma administrativa como un portal web abierto al publico, enfocandose en el **perfomance** y **UI/UX**.

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
>
> ```bash
> make help
> ```

## Panel administrativo y autenticación

`/admin/*` exige una sesión de staff (Supabase Auth, solo por invitación) y cada operación se
valida con políticas RLS en la base de datos. Para desarrollo local, `supabase db reset` carga
tres cuentas de prueba (contraseña `cdrs-dev`):

| Correo                 | Cargo                                |
| ---------------------- | ------------------------------------ |
| `dev.junior@usm.cl`    | Junior                               |
| `dev.senior@usm.cl`    | Senior                               |
| `dev.directivo@usm.cl` | Directivo                            |
| `dev.comun@usm.cl`     | Ninguno (cuenta sin acceso al panel) |

Ingresa en [http://localhost:5173/login](http://localhost:5173/login). Si tu base local es
anterior a esta configuración, ejecuta `make reset-seed` para aplicar las migraciones y crear las
cuentas. Para comprobar las restricciones por rol (sin cargo, Junior, Senior, Directivo) hay tres
capas de pruebas, todas contra Supabase local: `make test-db` (RLS en SQL), `make test-auth` (API de
Supabase y servidor web, requiere `.env`) y `make test-security` (ambas). Si cambias
`supabase/config.toml`, reinicia Supabase (`make stop` y luego `pnpx supabase start`) para que Auth lo aplique.

### Gestión del staff (invitaciones)

`/admin/miembros` invita, edita, da de baja y elimina staff (solo el Directivo escribe). La
autoridad es la base de datos: la RLS y las funciones `invitar_staff()`/`eliminar_staff()` validan
`usuarios:gestionar` con la sesión del Directivo, y eliminar borra también la cuenta de Auth. La
service role se usa en un único punto del servidor, enviar el correo de invitación, y solo después de
que `invitar_staff()` lo aprobó: copia la clave de `pnpx supabase status` a
`SUPABASE_SERVICE_ROLE_KEY` en `.env`. En local los correos llegan a Mailpit
([http://127.0.0.1:54324](http://127.0.0.1:54324)) y el enlace aterriza en `/auth/confirmar`, donde
el invitado crea su contraseña.

## Landing pública

Los textos (Sobre nosotros, FAQ, eventos, redes y metadatos) se editan en `src/lib/data/landing.json`
sin tocar los componentes; el schema de `src/lib/schemas/landing.ts` los valida al compilar. Para que
Discord y WhatsApp muestren la imagen al compartir el link, define `PUBLIC_SITE_URL` (dominio público,
sin `/` final) antes de `pnpm build`; sin ella solo se emiten título y descripción. Las imágenes
estáticas van en WebP; `static/logos/og-image.jpg` (1200×630) es la excepción, porque algunos
scrapers no leen WebP.

## Proxy de BoardGameGeek (#8)

Auto-completado de fichas para el inventario: `GET /admin/bgg/search`, `GET /admin/bgg/{id}` y
`POST /admin/bgg/{id}/caratula` (contrato en `static/openapi.yaml`). Requieren sesión de staff con
`inventario:editar`. El proxy escribe solo en la caché `JuegoBgg`, que no expira: `GET …/{id}?refrescar=1`
(botón "Actualizar desde BGG") fuerza una nueva consulta y, si BGG falla, se sirve la caché; el `Juego` se crea o enlaza
(`Juego.idBgg`) cuando el staff guarda la ficha (#19).

Variables (`.env.example`):

- `BGG_API_TOKEN`: token de la API de BGG. Sin token y sin mock responde 503.
- `BGG_MOCK=1`: no hace llamadas de red; lee `fixtures/bgg/thing/<id>.xml` y
  los `<item>` de `fixtures/bgg/search/*.xml` cuyo nombre contiene la consulta (subcadena, como BGG; `exacta=1` exige igualdad). Ids de ejemplo: 13 (base), 325 (expansión de 13), 174430
  (con carátula grande) y 30549 (sin imagen). Para que un juego aparezca en las búsquedas hay que agregarlo a un XML de `search/`.
- `BGG_MOCK_FALLA=timeout|429|503` (solo con mock): simula una caída para probar
  `cache-desactualizada` y el manejo de rate limit.

Las carátulas del mock **no están en git**: antes de usar `BGG_MOCK=1` corre una vez
`pnpm bgg:imagenes-mock`, que las genera en `fixtures/bgg/img/` (incluye una de varios MB para probar
el procesamiento). Si faltan, el mock usa una imagen plana y avisa por consola. Cuando tengas token,
`BGG_API_TOKEN=… pnpm bgg:capturar <idBgg…>` reemplaza los XML por respuestas reales (el diff de git
muestra cambios de formato). `pnpm bgg:test` corre las pruebas sin DB y `pnpm bgg:benchmark` el
benchmark de carátulas ([`docs/bgg-caratulas.md`](docs/bgg-caratulas.md)).

Las traducciones BGG → dominio (umbrales de dificultad, tipos, calificación mínima de votos, tamaño de
carátula, búsqueda) están en `src/lib/data/bgg.json`, validado por `src/lib/schemas/bgg.ts`: un JSON
inválido rompe el arranque en vez de producir datos raros. En `pnpm dev`, `/admin/inventario` incluye
una demo del buscador.

## Documentación de la API

Con el servidor de desarrollo en ejecución, la documentación interactiva está disponible en:

- [Swagger UI](http://localhost:5173/docs/api)
- [Contrato OpenAPI](http://localhost:5173/openapi.yaml)

El contrato fuente se encuentra en [`static/openapi.yaml`](static/openapi.yaml). Al agregar o modificar endpoints, este archivo debe actualizarse para mantener la documentación sincronizada con la implementación.

Swagger UI solo se sirve en desarrollo (`pnpm dev`); en un build de producción `/docs/api`
responde 404.

Swagger UI corre en el mismo origen que la app, así que el navegador adjunta las cookies de sesión
de Supabase a cada petición: si ya iniciaste sesión, los endpoints de `/admin/*` responden como ese
usuario (con su cargo y la RLS que le corresponde). Para probar como anónimo, usa una ventana de
incógnito. Sin sesión, `/admin/*` responde `303` hacia `/login`, y como Swagger sigue la
redirección verás un `200` con el HTML del login, no datos.
