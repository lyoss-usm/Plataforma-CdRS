## Datos de prueba

El proyecto incluye un generador de datos ficticios para **Supabase local**. Reemplaza únicamente
los registros de su namespace reservado (`SEED-*` e IDs entre `1000000000` y `1099999999`), por lo
que no debe eliminar datos creados manualmente. Por seguridad, rechaza conexiones que no apunten a
la base `postgres` en `localhost:54322`.

```bash
# Perfil pequeño y semilla reproducible por defecto
pnpm db:seed --profile small

# Perfil mediano con cantidades específicas
pnpm db:seed --profile medium --sansanos 100 --solicitudes 250 --prestamos 150

# Validar la generación sin conectarse a PostgreSQL
pnpm db:seed --profile large --seed 1234 --dry-run

# Recrear Supabase local y cargar el perfil pequeño
pnpm db:reset:seed

# Eliminar solamente los datos generados por el seed
pnpm db:seed:clean
# Equivalente con Make
make seed-clean
```

Los perfiles disponibles son `small`, `medium` y `large`. Se puede sobrescribir cualquiera de estas
cantidades: `cargos`, `permisos`, `cargoPermisos`, `sansanos`, `suspensiones`, `juegosBase`,
`expansiones`, `ejemplaresBase`, `ejemplaresExpansion`, `solicitudes` y `prestamos`. Las cantidades
son exactas; una combinación sin entidades padre suficientes falla antes de abrir una conexión.

La opción `--seed` controla la aleatoriedad y la fecha de referencia es fija, así que una misma
versión del proyecto produce el mismo dataset. Todos los nombres, contactos, juegos y préstamos
generados son ficticios. `authUserId` queda en `null`; el script no crea usuarios de Supabase Auth.

Las factories se prueban con `pnpm test:seed`. Con Supabase local activo se puede ejecutar
`pnpm test:seed:integration`, que comprueba conteos, idempotencia, preservación de datos manuales,
relaciones y rollback transaccional.
