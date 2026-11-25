# Migración de inventario: Excel + Notion → CSV

Prepara CSV validados con Zod: `Juego` representa el título y `Ejemplar`, cada caja.

## Supuestos

- **Carga inicial:** tablas vacías y migraciones aplicadas. IDs de juegos desde 1,
  primero bases y después expansiones.
- **Fuentes:** solo `Inventario` y Notion local. Excel prevalece; Notion completa
  descriptivos vacíos. Su captura es provisional. Descriptivos desconocidos quedan `NULL`.
- **QR:** se asume que contiene `Código`, aún sin verificar mediante escaneo.
  Se conservan los códigos, quitando espacios externos y convirtiendo a mayúsculas.
- **Estado:** determina la disponibilidad. `Bodega` pasa a `En bodega`;
  propietario, a `Con su dueño`. Los 23 `Prestado` se conservan sin historial.
- **Propiedad:** externo si `Estado=Con el propietario original` o `Situación` contiene
  `No pertenece al club`, sin distinguir mayúsculas ni espacios repetidos. El resto
  es interno; `Comentario` no determina propiedad ni cambia la disponibilidad.
- **Completitud:** las etiquetas `Completo.` o `Incompleto.` en `Situación` determinan
  la completitud (también sin punto final y sin distinguir mayúsculas). Sin etiqueta
  se asume `Completo` para respetar `NOT NULL`, aunque exista comentario.
  Etiquetas contradictorias bloquean los CSV.
- **Relaciones:** Catan, Carcassonne, Canvas, Ten y The Mind agrupan copias.
  Ciudadelas Clásico/Ciudadelas, Reinos de Papel/Paper Kingdom y ambas versiones de
  Hombres Lobo quedan separadas. `Expansion=TRUE` identifica expansiones con base
  predefinida; dependencias adicionales se documentan en el informe.
- **Duración y dificultad:** se usa el máximo de los rangos. `Media` pasa a
  `Intermedio`; Catan queda en `Intermedio` y `Extremo` de Sand pasa a `Difícil`.
  La edad procede de enteros positivos explícitos de Notion, nunca de la dificultad.
- **Jugadores:** Código Secreto Imágenes queda en 2–8, Pictureka! Cartas en 2–20 y
  8 Bit box en 3–6. Ricochet robots y Zombie Dice tienen mínimos 1 y 2 y máximo `NULL`;
  el filtro actual del catálogo excluye estos límites parciales.
- No se importan otras hojas, personas, préstamos históricos, carátulas ni datos BGG.

## Paso a paso

### 1. Preparar dependencias

Desde la raíz, con Python ≥ 3.10 y Node/pnpm del proyecto:

```bash
make migracion-init
```

Prepara el entorno Python e instala las dependencias de Python y Node.

### 2. Generar los archivos

```bash
make migracion-preparar EXCEL=/ruta/app.xlsx
```

Usa `scripts/importacion/notion.json` y escribe en `.importacion/csv`. Conserva las
fuentes y no se conecta a la base. Para otras rutas, usa una carpeta exclusiva:

```bash
make migracion-preparar EXCEL=/ruta/app.xlsx NOTION=/ruta/notion.json CSV_DIR=.importacion/otra
```

### 3. Revisar el informe

Abre `.importacion/csv/informe.json`: exige `aptoParaImportar: true`.
Incluye supuestos, conteos, fuentes y relaciones. Errores y advertencias se muestran
en consola; los errores bloquean los CSV. Corrige y regenera antes de importar.

### 4. Importar en la base

Aplica las migraciones en destino. Con `Juego` y `Ejemplar` vacías:

```bash
make migracion-importar
```

Si cambiaste la salida, usa `make migracion-importar CSV_DIR=.importacion/otra`.
El importador valida los tres CSV con Zod antes de conectarse. Carga bases →
expansiones → ejemplares en una transacción y ajusta la secuencia automáticamente.
Vacíos = `NULL`; booleanos = `true`/`false`. No edites los CSV con Excel.

La conexión predeterminada es `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
Para otro entorno define `DATABASE_URL` en el entorno o ejecuta
`make migracion-importar DATABASE_URL='postgresql://...'`. No se carga `.env` automáticamente.

Rechaza tablas con datos y ejecuciones repetidas; no borra ni actualiza registros.
Ningún comando inicia servicios ni resetea la base. PostgreSQL no revierte cambios
de secuencia si falla una transacción.

### 5. Verificar el resultado

Comprueba **261 juegos y 268 ejemplares**. Conserva `informe.json` de la preparación:
documenta los supuestos, las reglas aplicadas y los conteos.
Regenerar CSV no sincroniza la base. Pruebas: `make test-importacion`.

### 6. Advertencia

Dado que el archivo Excel de AppSheet define pocas relaciones explícitas entre sus registros, los datos migrados podrían contener inconsistencias. Será necesario revisar estos casos en profundidad y representar la información mediante campos y relaciones estructurados, aprovechando las restricciones de integridad de la base de datos y reduciendo la dependencia del texto libre en las columnas «Comentario» y «Situación» de cada ejemplar.