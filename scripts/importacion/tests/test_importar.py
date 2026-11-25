"""Lectura estricta de CSV y carga atómica contra PostgreSQL de pruebas optativo."""

from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
import csv
from io import StringIO
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.importacion import importar as cargador
from scripts.importacion.normalizar import CSV_ARCHIVOS, EJEMPLAR_COLUMNAS, JUEGO_COLUMNAS

try:
    import psycopg
    from psycopg.conninfo import conninfo_to_dict
except ImportError:
    psycopg = None


DATABASE_TEST_URL = os.environ.get("IMPORT_DATABASE_TEST_URL")
MIGRACIONES = Path(__file__).resolve().parents[3] / "supabase" / "migrations"


def aceptar(payload):
    return {"ok": True, "errores": [], **deepcopy(payload)}


def datos():
    base = {
        "idJuego": 1, "nombreJuego": 'Juego, "Árbol"', "tipo": "Juego base", "idJuegoBase": None,
        "edadMinima": 8, "jugadoresMin": 1, "jugadoresMax": None, "duracion": 45,
        "calificacion": None, "dificultad": "Intermedio", "pathImagen": None,
        "idBgg": None, "manual": None, "video": None,
    }
    expansion = {**base, "idJuego": 2, "nombreJuego": "Expansión Ñ", "tipo": "Expansión", "idJuegoBase": 1}
    copy = {
        "idEjemplar": "QR-ÁRBOL", "idJuego": 1, "esExterno": False,
        "estadoCompletitud": "Completo", "situacion": None,
        "comentarios": 'Falta una pieza, "roja"\ny otra azul.', "componentes": None,
        "estadoEjemplar": "Prestado",
    }
    return {
        "juegos": [base, expansion],
        "ejemplares": [copy, {**copy, "idEjemplar": "QR-EXTERNO", "esExterno": True, "comentarios": None, "estadoEjemplar": "Con su dueño"},
                       {**copy, "idEjemplar": "QR-EXP", "idJuego": 2, "estadoCompletitud": "Completo", "comentarios": None}],
    }


def escribir(carpeta, payload):
    carpeta.mkdir(exist_ok=True)
    buckets = (
        [game for game in payload["juegos"] if game["tipo"] == "Juego base"],
        [game for game in payload["juegos"] if game["tipo"] == "Expansión"],
        payload["ejemplares"],
    )
    for name, rows, columns in zip(CSV_ARCHIVOS, buckets, (JUEGO_COLUMNAS, JUEGO_COLUMNAS, EJEMPLAR_COLUMNAS)):
        escribir_archivo(carpeta / name, columns, rows)


def escribir_archivo(path, columns, rows):
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: str(row[field]).lower() if isinstance(row.get(field), bool) else row.get(field) for field in columns})


class LecturaCsvTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.folder = Path(directory.name)
        self.payload = datos()
        escribir(self.folder, self.payload)

    def leer(self, *, real=False):
        if real:
            return cargador.leer_csv(self.folder)
        with patch.object(cargador, "validate_payload", side_effect=aceptar):
            return cargador.leer_csv(self.folder)

    def test_roundtrip_conserva_tipos_null_unicode_comillas_y_saltos_de_linea(self):
        before = {file.name: file.read_bytes() for file in self.folder.iterdir()}
        with patch.object(cargador, "validate_payload", side_effect=aceptar) as validate:
            result = cargador.leer_csv(self.folder)
        self.assertEqual(result, self.payload)
        validate.assert_called_once_with(self.payload)
        self.assertEqual(before, {file.name: file.read_bytes() for file in self.folder.iterdir()})
        self.assertIs(result["ejemplares"][0]["esExterno"], False)
        self.assertIsNone(result["juegos"][0]["jugadoresMax"])
        self.assertEqual(result["ejemplares"][0]["estadoCompletitud"], "Completo")
        self.assertIsNone(result["ejemplares"][0]["situacion"])

    def test_schemas_zod_reales_aceptan_lote_y_rechazan_rango_invertido(self):
        self.assertEqual(self.leer(real=True), self.payload)
        self.payload["juegos"][0].update({"jugadoresMin": 5, "jugadoresMax": 2})
        escribir(self.folder, self.payload)
        with self.assertRaises(ValueError):
            self.leer(real=True)

    def test_cabeceras_admiten_otro_orden_sin_perder_columnas(self):
        escribir_archivo(self.folder / "juegos_base.csv", tuple(reversed(JUEGO_COLUMNAS)), [self.payload["juegos"][0]])
        self.assertEqual(self.leer(), self.payload)

    def test_cabeceras_faltantes_sobrantes_o_duplicadas_se_rechazan(self):
        for columns in (JUEGO_COLUMNAS[:-1], (*JUEGO_COLUMNAS, "campoAjeno"), (*JUEGO_COLUMNAS, "idJuego")):
            with self.subTest(columns=columns):
                escribir_archivo(self.folder / "juegos_base.csv", columns, [self.payload["juegos"][0]])
                with self.assertRaises(ValueError):
                    self.leer()

    def test_archivo_faltante_o_fila_con_celdas_sobrantes_se_rechaza(self):
        target = self.folder / "ejemplares.csv"
        target.unlink()
        with self.assertRaises((OSError, ValueError)):
            self.leer()
        escribir(self.folder, self.payload)
        with target.open("a", encoding="utf-8") as file:
            file.write("QR-OTRO,1,false,Completo,,,,En bodega,celda_sobrante\n")
        with self.assertRaises(ValueError):
            self.leer()

    def test_ampliaciones_vacias_son_validas_pero_lote_entero_vacio_no(self):
        self.payload["juegos"] = self.payload["juegos"][:1]
        self.payload["ejemplares"] = self.payload["ejemplares"][:1]
        escribir(self.folder, self.payload)
        self.assertEqual(self.leer(), self.payload)
        escribir(self.folder, {"juegos": [], "ejemplares": []})
        with self.assertRaises(ValueError):
            self.leer()

    def test_booleanos_y_enteros_no_se_interpretan_de_forma_ambigua(self):
        for entity, field, value in (("ejemplares", "esExterno", "yes"), ("juegos", "idJuego", "1.5"), ("juegos", "duracion", "cuarenta")):
            with self.subTest(field=field):
                invalid = deepcopy(self.payload)
                invalid[entity][0][field] = value
                escribir(self.folder, invalid)
                with self.assertRaises(ValueError):
                    self.leer()

    def test_qr_debe_llegar_normalizado_y_no_se_reescribe(self):
        for value in ("qr-árbol", " QR-ÁRBOL ", ""):
            with self.subTest(value=value):
                invalid = deepcopy(self.payload)
                invalid["ejemplares"][0]["idEjemplar"] = value
                escribir(self.folder, invalid)
                with self.assertRaises(ValueError):
                    self.leer()

    def test_ids_nombres_y_qr_duplicados_se_rechazan(self):
        cases = []
        for field in ("idJuego", "nombreJuego"):
            invalid = deepcopy(self.payload)
            invalid["juegos"][1][field] = invalid["juegos"][0][field]
            cases.append(invalid)
        invalid = deepcopy(self.payload)
        invalid["ejemplares"][1]["idEjemplar"] = invalid["ejemplares"][0]["idEjemplar"]
        cases.append(invalid)
        for invalid in cases:
            with self.subTest(invalid=invalid):
                escribir(self.folder, invalid)
                with self.assertRaises(ValueError):
                    self.leer()

    def test_fk_de_ejemplar_y_expansion_deben_existir_y_base_debe_ser_juego_base(self):
        for entity, field, value in (("ejemplares", "idJuego", 999), ("juegos", "idJuegoBase", 999), ("juegos", "idJuegoBase", 2)):
            with self.subTest(field=field, value=value):
                invalid = deepcopy(self.payload)
                index = 1 if entity == "juegos" else 0
                invalid[entity][index][field] = value
                escribir(self.folder, invalid)
                with self.assertRaises(ValueError):
                    self.leer()

    def test_tipo_de_fila_debe_corresponder_al_archivo_csv(self):
        escribir_archivo(self.folder / "expansiones.csv", JUEGO_COLUMNAS, [self.payload["juegos"][0]])
        with self.assertRaises(ValueError):
            self.leer()

    def test_zod_rechaza_lote_antes_de_abrir_conexion_sql(self):
        with patch.object(cargador, "validate_payload", return_value={"ok": False, "errores": [{"entidad": "Juego", "indice": 0}], "juegos": [], "ejemplares": []}), \
                patch("psycopg.connect") as connect:
            with self.assertRaises(ValueError):
                cargador.importar(self.folder, "postgresql://host.invalid/no_conectar")
        connect.assert_not_called()

    def test_completitud_vacia_se_rechaza_antes_de_conectar_aunque_haya_comentario(self):
        self.payload["ejemplares"][0]["estadoCompletitud"] = None
        escribir(self.folder, self.payload)
        with patch("psycopg.connect") as connect:
            with self.assertRaises(ValueError):
                cargador.importar(self.folder, "postgresql://host.invalid/no_conectar")
        connect.assert_not_called()

    def test_csv_invalido_se_rechaza_antes_de_abrir_conexion_sql(self):
        self.payload["ejemplares"][0]["idEjemplar"] = "sin_normalizar"
        escribir(self.folder, self.payload)
        with patch.object(cargador, "validate_payload", side_effect=aceptar), patch("psycopg.connect") as connect:
            with self.assertRaises(ValueError):
                cargador.importar(self.folder, "postgresql://host.invalid/no_conectar")
        connect.assert_not_called()

    def test_cli_prioriza_argumento_sobre_entorno_y_tiene_default_local(self):
        counts = {"juegosBase": 1, "juegosExpansion": 1, "juegosTotal": 2, "ejemplaresTotal": 3, "siguienteIdJuego": 3}
        for environment, arguments, expected in (
            ({}, [], cargador.DEFAULT_DATABASE_URL),
            ({"DATABASE_URL": "postgresql://entorno/db"}, [], "postgresql://entorno/db"),
            ({"DATABASE_URL": "postgresql://entorno/db"}, ["--database-url", "postgresql://argumento/db"], "postgresql://argumento/db"),
        ):
            with self.subTest(expected=expected), patch.dict(os.environ, environment, clear=True), \
                    patch.object(cargador, "importar", return_value=counts) as load, redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(cargador.main(arguments), 0)
                load.assert_called_once_with(Path(".importacion/csv"), expected)

    def test_cli_acepta_carpeta_csv_y_reporta_errores_sin_exponer_credenciales(self):
        secret = "password=NO_PUBLICAR_CREDENCIAL"
        stderr = StringIO()
        with patch.object(cargador, "importar", side_effect=psycopg.OperationalError(secret)) as load, \
                redirect_stdout(StringIO()), redirect_stderr(stderr):
            result = cargador.main(["--csv", str(self.folder), "--database-url", "postgresql://usuario:secreto@host/db"])
        self.assertEqual(result, 1)
        load.assert_called_once_with(self.folder, "postgresql://usuario:secreto@host/db")
        self.assertNotIn("NO_PUBLICAR_CREDENCIAL", stderr.getvalue())
        self.assertNotIn("usuario:secreto", stderr.getvalue())
        self.assertTrue(stderr.getvalue())

    def test_cli_fallo_de_datos_no_afirma_que_importo_registros(self):
        stdout, stderr = StringIO(), StringIO()
        with patch.object(cargador, "importar", side_effect=ValueError("Código duplicado")), redirect_stdout(stdout), redirect_stderr(stderr):
            self.assertEqual(cargador.main(["--csv", str(self.folder)]), 1)
        self.assertIn("Código duplicado", stderr.getvalue())
        self.assertNotIn("Importación completada", stdout.getvalue())


@unittest.skipUnless(DATABASE_TEST_URL, "Configure IMPORT_DATABASE_TEST_URL para una PostgreSQL local descartable.")
class ImportacionPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if psycopg is None:
            raise unittest.SkipTest("Las pruebas SQL necesitan psycopg.")
        options = conninfo_to_dict(DATABASE_TEST_URL)
        host = options.get("host", "")
        database = options.get("dbname", "")
        if not database.startswith("test_importacion_") or not (host in {"localhost", "127.0.0.1", "::1"} or host.startswith("/tmp/")):
            raise RuntimeError("La integración solo puede recrear una DB local llamada test_importacion_*.")

    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.folder = Path(directory.name)
        self.payload = datos()
        escribir(self.folder, self.payload)
        with psycopg.connect(DATABASE_TEST_URL, autocommit=True) as connection:
            connection.execute("DROP SCHEMA public CASCADE")
            connection.execute("CREATE SCHEMA public")
            for filename in (
                "20260828200501_create_initial_schema.sql",
                "20260828203046_add_juego_check_and_trigger.sql",
                "20260828205334_validate_juego_base_reference.sql",
            ):
                connection.execute((MIGRACIONES / filename).read_text(encoding="utf-8"))
            # La migración BGG agrega esta columna junto con funciones ajenas al importador.
            connection.execute('ALTER TABLE public."Juego" ADD COLUMN "idBgg" INTEGER')

    def consulta(self, query, parameters=None):
        with psycopg.connect(DATABASE_TEST_URL) as connection:
            return connection.execute(query, parameters).fetchall()

    def secuencia(self):
        return self.consulta('SELECT last_value, is_called FROM public."Juego_idJuego_seq"')[0]

    def conteos_sql(self):
        return self.consulta('SELECT (SELECT count(*) FROM public."Juego"), (SELECT count(*) FROM public."Ejemplar")')[0]

    def test_importa_bases_expansiones_y_ejemplares_con_null_bool_y_unicode(self):
        counts = cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(counts, {"juegosBase": 1, "juegosExpansion": 1, "juegosTotal": 2, "ejemplaresTotal": 3, "siguienteIdJuego": 3})
        self.assertEqual(self.conteos_sql(), (2, 3))
        games = self.consulta('SELECT "idJuego", "nombreJuego", "tipo", "idJuegoBase", "jugadoresMax", "idBgg" FROM public."Juego" ORDER BY "idJuego"')
        self.assertEqual(games, [(1, 'Juego, "Árbol"', "Juego base", None, None, None), (2, "Expansión Ñ", "Expansión", 1, None, None)])
        copy = self.consulta('SELECT "idJuego", "esExterno", "situacion", "comentarios" FROM public."Ejemplar" WHERE "idEjemplar" = %s', ("QR-ÁRBOL",))[0]
        self.assertEqual(copy, (1, False, None, self.payload["ejemplares"][0]["comentarios"]))
        self.assertEqual(self.consulta('SELECT "esExterno" FROM public."Ejemplar" WHERE "idEjemplar" = %s', ("QR-EXTERNO",)), [(True,)])

    def test_ids_explicitos_con_huecos_y_siguiente_serial_usan_maximo(self):
        self.payload["juegos"][1]["idJuego"] = 23
        self.payload["ejemplares"][2]["idJuego"] = 23
        escribir(self.folder, self.payload)
        counts = cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(counts["siguienteIdJuego"], 24)
        inserted = self.consulta('INSERT INTO public."Juego" ("nombreJuego", "tipo") VALUES (%s, %s) RETURNING "idJuego"', ("Juego posterior", "Juego base"))
        self.assertEqual(inserted, [(24,)])
        self.assertEqual(self.conteos_sql(), (3, 3))

    def test_fallo_tardio_revierte_todos_los_lotes_y_conserva_la_secuencia(self):
        with psycopg.connect(DATABASE_TEST_URL) as connection:
            connection.execute('ALTER TABLE public."Ejemplar" ADD CONSTRAINT prueba_fallo_tardio CHECK ("idEjemplar" <> \'QR-EXP\')')
            connection.execute('SELECT setval(pg_get_serial_sequence(\'public."Juego"\', \'idJuego\'), 91, false)')
        before = self.secuencia()
        with self.assertRaises(psycopg.IntegrityError):
            cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(self.conteos_sql(), (0, 0))
        self.assertEqual(self.secuencia(), before)

    def test_no_adopta_datos_preexistentes_ni_altera_su_secuencia(self):
        with psycopg.connect(DATABASE_TEST_URL) as connection:
            connection.execute('INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo") VALUES (7, %s, %s)', ("Juego preexistente", "Juego base"))
            connection.execute('SELECT setval(pg_get_serial_sequence(\'public."Juego"\', \'idJuego\'), 7, true)')
        before = self.secuencia()
        with self.assertRaises(ValueError):
            cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(self.conteos_sql(), (1, 0))
        self.assertEqual(self.consulta('SELECT "idJuego", "nombreJuego" FROM public."Juego"'), [(7, "Juego preexistente")])
        self.assertEqual(self.secuencia(), before)

    def test_segunda_ejecucion_se_rechaza_y_preserva_la_carga_completa(self):
        cargador.importar(self.folder, DATABASE_TEST_URL)
        games_before = self.consulta('SELECT * FROM public."Juego" ORDER BY "idJuego"')
        copies_before = self.consulta('SELECT * FROM public."Ejemplar" ORDER BY "idEjemplar"')
        sequence_before = self.secuencia()
        with self.assertRaises(ValueError):
            cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(self.consulta('SELECT * FROM public."Juego" ORDER BY "idJuego"'), games_before)
        self.assertEqual(self.consulta('SELECT * FROM public."Ejemplar" ORDER BY "idEjemplar"'), copies_before)
        self.assertEqual(self.secuencia(), sequence_before)

    def test_texto_sql_en_comentarios_se_guarda_como_dato(self):
        text = 'x\'); DROP TABLE "Juego"; --\ncomentario legítimo, ñ'
        self.payload["ejemplares"][0]["comentarios"] = text
        escribir(self.folder, self.payload)
        cargador.importar(self.folder, DATABASE_TEST_URL)
        self.assertEqual(self.conteos_sql(), (2, 3))
        self.assertEqual(self.consulta('SELECT "comentarios" FROM public."Ejemplar" WHERE "idEjemplar" = %s', ("QR-ÁRBOL",)), [(text,)])


if __name__ == "__main__":
    unittest.main()
