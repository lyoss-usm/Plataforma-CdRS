# AGENTS.md

Plataforma **CdRS**: gestión de préstamos e inventario del Club de Rol Sansano. Svelte 5 (runes) +
TypeScript + Tailwind CSS v4 + Supabase, con pnpm.

- Visión/MVP → `RFC.md`
- Flujos de negocio y decisiones → [wiki · Flujos del Sistema](https://github.com/lyoss-usm/Plataforma-CdRS/wiki/Flujos-del-Sistema) (leer el § de la pantalla antes de tocarla)
- Quick start y docs → `README.md`

## Comandos

Verificación obligatoria al terminar una tarea:

```bash
pnpm check    # svelte-check (tipos + snippets)
pnpm lint     # prettier --check . && eslint .
pnpm build    # vite build (SSR + client)
```

Formato solo de lo tocado:

```bash
pnpm exec prettier --write <archivos modificados>
```

Entorno/db (Makefile):

```bash
make init                 # pnpm install + .env
make seed-small|medium|large   # seed faker contra Supabase local
make reset-seed           # supabase db reset --local + seed
make test-seed            # factories/zod sin DB
make stop                 # apaga Supabase local
```

**Regla:** no lanzar `pnpm dev`/`make start` (los corre el usuario). `prettier --check`
puede fallar en archivos preexistentes sin formatear (README, RFC y algunos `.svelte`):
no formatear archivos ajenos a la tarea.

## Stack no obvio

- pnpm (no npm); Node ≥ 22.13.
- Supabase local vía Makefile; seed faker en `scripts/seed` (`pnpm db:seed --profile <size>`).
- Zod 4: schemas en `src/lib/schemas/` son la **única fuente** de tipos y validación (front + backend).
- Iconos: `@lucide/svelte` (ya instalado) vía registro `src/lib/icons.ts` + `Icon.svelte`; no agregar librerías.
- Swagger en `/docs/api`; actualizar `static/openapi.yaml` al tocar endpoints (README).

## Convenciones

- Svelte 5 con runes (`$state`, `$derived`, `$props`) y snippets tipados (`import type { Snippet }`);
  sin API legacy. Referencia: `src/lib/components/admin/SectionPage.svelte`.
- Dominio en español: `Sansano`, `Solicitud`, `Ejemplar`, `Prestamo`, `Suspension`, `Cargo`, `Permiso`.
- Admin: roles (junior/senior/directivo), sidebar/quickActions/guards en `src/lib/data/admin.ts`; sesión
  mock en `src/lib/stores/adminSession.svelte.ts`. Respetar visibilidad por rol.
- Design tokens: usar las utilities de `src/routes/layout.css` (`surface-level-1/2/3`, `glass-border`,
  `ice-glow`) y tokens de color/tipografía; no inventar clases.
- Formularios: validación por campo (`validarCampo`/`mostrarError` + `tocado`/`intentoEnvio`),
  `aria-invalid` + `aria-describedby`. Referencia: `src/lib/components/catalog/SolicitudModal.svelte`.
- a11y: acción clicable = `<button>` real; evitar `aria-disabled` en `<div>`.
- Maquetas "tracer bullet": rutas reales con datos mock tipados con los schemas; variantes demo solo
  bajo `import.meta.env.DEV`. No romper pantallas ya entregadas.

## Flujo de trabajo

Antes de maquetar/implementar, leer la sección de la wiki (Flujos del Sistema) que corresponde a la
pantalla y la issue (#N).
