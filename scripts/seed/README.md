## Datos de prueba

El proyecto incluye un generador de datos ficticios para **Supabase local**. Reemplaza únicamente
los registros de su namespace reservado (`SEED-*` e IDs entre `1000000000` y `1099999999`), por lo
que no debe eliminar datos creados manualmente. Por seguridad, rechaza conexiones que no apunten a
la base `postgres` en `localhost:54322`.

## Imágenes de muestra

Las portadas utilizadas por el seed se encuentran en `static/ludoteca`. Supabase CLI utiliza esos
archivos para poblar el bucket público `ludoteca`, declarado en `supabase/config.toml`.

Con Supabase local iniciado, el bucket se puede poblar manualmente con:

```bash
pnpm exec supabase seed buckets --local
```

De manera predeterminada, las URLs generadas apuntan a:

```text
http://127.0.0.1:54321/storage/v1/object/public/ludoteca/<archivo>
```

Para generar datos destinados a un proyecto remoto, se debe indicar el origen de ese proyecto:

```bash
pnpm db:seed --profile small --supabase-url https://<project-ref>.supabase.co
```

También se puede definir mediante la variable de entorno `SUPABASE_URL`. El argumento
`--supabase-url` tiene prioridad sobre la variable de entorno.

El bucket remoto debe existir, ser público y contener las mismas imágenes antes de ejecutar el seed
contra esa base de datos.

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

Las factories se prueban con `pnpm test:seed`. Esta prueba también comprueba que la lista de
imágenes coincida con los archivos de `static/ludoteca` y que las URLs públicas sean correctas. Con
Supabase local activo se puede ejecutar `pnpm test:seed:integration`, que comprueba conteos,
persistencia de las imágenes, idempotencia, preservación de datos manuales, relaciones y rollback
transaccional.
