"""Carga los tres CSV normalizados en Juego/Ejemplar, sin leer fuentes ni informe.

Solo admite tablas vacías y usa una transacción para toda la carga. El setval
final ajusta el SERIAL de Juego; PostgreSQL no revierte los cambios de secuencias
si después falla el commit. Las inserciones anteriores no consumen la secuencia.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
from pathlib import Path
import re
import sys

if __package__:
    from .normalizar import (
        CSV_ARCHIVOS, EJEMPLAR_COLUMNAS, JUEGO_COLUMNAS, ZodBridgeError,
        validate_payload,
    )
else:
    from normalizar import (
        CSV_ARCHIVOS, EJEMPLAR_COLUMNAS, JUEGO_COLUMNAS, ZodBridgeError,
        validate_payload,
    )


DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
ENTEROS = {"idJuego", "idJuegoBase", "edadMinima", "jugadoresMin", "jugadoresMax", "duracion", "idBgg"}


def _valor(campo: str, texto: str, ubicacion: str):
    """Convierte una celda CSV al tipo esperado por su columna.

    Args:
        campo: Nombre de la columna de destino.
        texto: Contenido de la celda; una cadena vacía representa NULL.
        ubicacion: Archivo y línea que se incluirán en los errores.

    Returns:
        int | float | bool | str | None: Valor convertido al tipo de la columna;
            una cadena vacía se convierte en None.

    Raises:
        ValueError: El formato numérico o booleano no es válido.
    """
    if texto == "":
        return None
    if campo in ENTEROS:
        if not re.fullmatch(r"[+-]?[0-9]+", texto):
            raise ValueError(f"{ubicacion}: {campo} debe ser un entero, sin decimales.")
        return int(texto)
    if campo == "esExterno":
        if texto not in ("true", "false"):
            raise ValueError(f"{ubicacion}: esExterno debe ser true o false.")
        return texto == "true"
    if campo == "calificacion":
        if not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?", texto):
            raise ValueError(f"{ubicacion}: calificacion debe ser un número finito.")
        numero = float(texto)
        if not math.isfinite(numero):
            raise ValueError(f"{ubicacion}: calificacion debe ser un número finito.")
        return numero
    return texto


def _leer_archivo(path: Path, columnas: tuple[str, ...]) -> list[dict]:
    """Lee un CSV UTF-8, comprueba sus cabeceras y convierte sus celdas.

    Args:
        path: Ruta del CSV, cuyo contenido puede empezar con BOM.
        columnas: Columnas esperadas, sin admitir duplicados ni extras.

    Returns:
        list[dict]: Filas convertidas, conservando el orden del archivo.

    Raises:
        OSError: El archivo no se puede abrir o leer.
        UnicodeError: El contenido no es UTF-8 válido.
        csv.Error: La sintaxis del CSV no es válida.
        ValueError: Las cabeceras, el número de columnas o una celda son inválidos.
    """
    rows = []
    with path.open("r", encoding="utf-8-sig", newline="") as archivo:
        reader = csv.reader(archivo, strict=True)
        headers = next(reader, None)
        if headers is None or len(headers) != len(set(headers)) or set(headers) != set(columnas):
            raise ValueError(f"{path.name}: las cabeceras deben coincidir con las columnas de destino, sin duplicados ni extras.")
        for values in reader:
            location = f"{path.name}, línea {reader.line_num}"
            if len(values) != len(headers):
                raise ValueError(f"{location}: cantidad de columnas incorrecta.")
            rows.append({field: _valor(field, value, location) for field, value in zip(headers, values, strict=True)})
    return rows


def leer_csv(carpeta: Path) -> dict:
    """Valida el lote completo antes de que se abra una conexión SQL.

    Args:
        carpeta: Directorio con los tres CSV generados por el normalizador.

    Returns:
        dict: Listas juegos y ejemplares validadas mediante Zod y las relaciones
            del lote.

    Raises:
        OSError: Un archivo no se puede abrir o leer.
        UnicodeError: Un archivo no contiene UTF-8 válido.
        csv.Error: Un CSV tiene sintaxis inválida.
        ValueError: El lote está incompleto o incumple tipos, unicidad o relaciones.
        ZodBridgeError: El puente de validación no se puede ejecutar correctamente.
    """
    carpeta = Path(carpeta)
    bases = _leer_archivo(carpeta / CSV_ARCHIVOS[0], JUEGO_COLUMNAS)
    expansiones = _leer_archivo(carpeta / CSV_ARCHIVOS[1], JUEGO_COLUMNAS)
    ejemplares = _leer_archivo(carpeta / CSV_ARCHIVOS[2], EJEMPLAR_COLUMNAS)
    if any(row["tipo"] != "Juego base" for row in bases) or any(row["tipo"] != "Expansión" for row in expansiones):
        raise ValueError("Cada juego debe estar en el CSV correspondiente a su tipo.")
    payload = {"juegos": bases + expansiones, "ejemplares": ejemplares}
    if not payload["juegos"] or not ejemplares:
        raise ValueError("La carga necesita juegos y ejemplares; el lote está vacío o incompleto.")
    if any(not isinstance(row["idEjemplar"], str) or not row["idEjemplar"]
           or row["idEjemplar"] != row["idEjemplar"].strip().upper() for row in ejemplares):
        raise ValueError("Los QR deben estar normalizados con trim y mayúsculas antes de importar.")
    checked = validate_payload(payload)
    if not checked["ok"]:
        raise ValueError("Los CSV no cumplen los schemas Zod o los límites SQL: " +
                         json_errores(checked.get("errores", [])))
    if any(len(checked[name]) != len(payload[name]) for name in payload):
        raise ValueError("La validación alteró la cantidad de filas; no se importará el lote.")
    payload = {name: checked[name] for name in payload}
    juegos, ejemplares = payload["juegos"], payload["ejemplares"]
    ids = [game["idJuego"] for game in juegos]
    nombres = [game["nombreJuego"] for game in juegos]
    qrs = [copy["idEjemplar"] for copy in ejemplares]
    if len(ids) != len(set(ids)) or len(nombres) != len(set(nombres)):
        raise ValueError("Hay IDs o nombres de Juego duplicados en los CSV.")
    if len(qrs) != len(set(qrs)) or any(not qr or qr != qr.strip().upper() for qr in qrs):
        raise ValueError("Los QR deben ser únicos y estar normalizados con trim y mayúsculas.")
    games = {game["idJuego"]: game for game in juegos}
    for game in juegos:
        if game["tipo"] == "Expansión":
            base = games.get(game["idJuegoBase"])
            if base is None or base["tipo"] != "Juego base":
                raise ValueError("Una expansión referencia una base ausente o que también es expansión.")
        elif game["idJuegoBase"] is not None:
            raise ValueError("Un juego base no puede referenciar otro juego.")
    if any(copy["idJuego"] not in games for copy in ejemplares):
        raise ValueError("Un ejemplar referencia un Juego ausente del lote.")
    if {copy["idJuego"] for copy in ejemplares} != set(ids):
        raise ValueError("Todos los juegos de esta carga deben tener al menos un ejemplar.")
    return payload


def json_errores(errores: list) -> str:
    """Serializa los errores Zod, que contienen rutas y mensajes sin valores de entrada.

    Args:
        errores: Errores devueltos por el puente de validación.

    Returns:
        str: Representación JSON que conserva los caracteres del idioma original.
    """
    import json

    return json.dumps(errores, ensure_ascii=False)


def _insertar(cursor, tabla: str, columnas: tuple[str, ...], rows: list[dict]) -> None:
    """Inserta las filas con parámetros, usando la transacción del llamador.

    Args:
        cursor (psycopg.Cursor): Cursor de la conexión de destino.
        tabla: Nombre de la tabla dentro del esquema public.
        columnas: Columnas de destino y orden de sus valores.
        rows: Filas validadas; una lista vacía no ejecuta SQL.

    Raises:
        psycopg.Error: PostgreSQL rechaza una inserción o falla la conexión.
    """
    from psycopg import sql

    if not rows:
        return
    query = sql.SQL("INSERT INTO public.{} ({}) VALUES ({})").format(
        sql.Identifier(tabla), sql.SQL(", ").join(map(sql.Identifier, columnas)),
        sql.SQL(", ").join(sql.Placeholder() for _ in columnas),
    )
    cursor.executemany(query, (tuple(row[field] for field in columnas) for row in rows))


def importar(carpeta: Path, database_url: str) -> dict:
    """Carga bases, expansiones y ejemplares en una única transacción.

    Valida los CSV antes de conectar y bloquea las tablas para exigir que estén
    vacías. Ajusta la secuencia de Juego como última operación SQL: las inserciones
    se revierten ante un error, pero setval no se revierte si falla el commit.

    Args:
        carpeta: Directorio con los tres CSV normalizados.
        database_url: Cadena de conexión PostgreSQL.

    Returns:
        dict: Conteos importados y siguiente idJuego esperado tras confirmar
            la carga.

    Raises:
        OSError: No se pueden leer los CSV.
        UnicodeError: Un CSV no contiene UTF-8 válido.
        csv.Error: Un CSV tiene sintaxis inválida.
        ValueError: El lote es inválido o las tablas de destino no están vacías.
        ZodBridgeError: Falla el puente de validación.
        ImportError: No está instalada la dependencia psycopg.
        psycopg.Error: Falla la conexión, una operación SQL o el commit.
    """
    payload = leer_csv(carpeta)
    import psycopg

    bases = [game for game in payload["juegos"] if game["tipo"] == "Juego base"]
    expansiones = [game for game in payload["juegos"] if game["tipo"] == "Expansión"]
    ultimo_id = max(game["idJuego"] for game in payload["juegos"])
    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.transaction():
            with connection.cursor() as cursor:
                # Impide inserciones concurrentes entre comprobar e importar.
                cursor.execute('LOCK TABLE public."Juego", public."Ejemplar" IN SHARE ROW EXCLUSIVE MODE')
                cursor.execute('SELECT EXISTS (SELECT 1 FROM public."Juego"), EXISTS (SELECT 1 FROM public."Ejemplar")')
                if any(cursor.fetchone()):
                    raise ValueError("La carga inicial requiere Juego y Ejemplar vacías. No se borró ni actualizó ningún registro.")
                _insertar(cursor, "Juego", JUEGO_COLUMNAS, bases)
                _insertar(cursor, "Juego", JUEGO_COLUMNAS, expansiones)
                _insertar(cursor, "Ejemplar", EJEMPLAR_COLUMNAS, payload["ejemplares"])
                # Última operación SQL: setval no es transaccional en PostgreSQL.
                cursor.execute(
                    """SELECT setval(pg_get_serial_sequence('public."Juego"', 'idJuego'), %s, true)""",
                    (ultimo_id,),
                )
    return {"juegosBase": len(bases), "juegosExpansion": len(expansiones),
            "juegosTotal": len(payload["juegos"]), "ejemplaresTotal": len(payload["ejemplares"]),
            "siguienteIdJuego": ultimo_id + 1}


def main(argv: list[str] | None = None) -> int:
    """Ejecuta la importación desde la CLI y muestra su resultado.

    Args:
        argv: Argumentos de la CLI; None utiliza los del proceso. La conexión se
            toma de --database-url, DATABASE_URL o Supabase local, en ese orden.

    Returns:
        int: 0 si la importación terminó o 1 ante errores capturados.

    Raises:
        SystemExit: argparse procesa --help o rechaza los argumentos.
    """
    parser = argparse.ArgumentParser(description="Importa los tres CSV normalizados en una base con Juego/Ejemplar vacías.")
    parser.add_argument("--csv", type=Path, default=Path(".importacion/csv"), help="Carpeta de juegos_base.csv, expansiones.csv y ejemplares.csv.")
    parser.add_argument("--database-url", help="Conexión SQL; usa DATABASE_URL o Supabase local si se omite.")
    args = parser.parse_args(argv)
    database_url = args.database_url or os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL
    try:
        import psycopg

        conteos = importar(args.csv, database_url)
    except ImportError:
        print("Falta psycopg; instala scripts/importacion/requirements.txt en el entorno Python.", file=sys.stderr)
        return 1
    except (OSError, ValueError, csv.Error, ZodBridgeError) as error:
        print(str(error), file=sys.stderr)
        return 1
    except psycopg.Error as error:
        restriction = getattr(error.diag, "constraint_name", None)
        detail = f" Restricción: {restriction}." if restriction else ""
        code = f" Código SQL: {error.sqlstate}." if error.sqlstate else ""
        print(f"La base rechazó la carga o la conexión falló.{code}{detail} No se completó la importación.", file=sys.stderr)
        return 1
    print(f"Importados: {conteos['juegosBase']} juegos base, {conteos['juegosExpansion']} expansiones y {conteos['ejemplaresTotal']} ejemplares.")
    print(f"Próximo idJuego: {conteos['siguienteIdJuego']}.")
    print(f"Supuestos y conteos: {args.csv / 'informe.json'} (informe de normalización).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
