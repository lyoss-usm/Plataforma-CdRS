"""Exportación CSV, diagnóstico de errores y protección de las dos fuentes."""

from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
import csv
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.importacion import normalizar as cli


class CliTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.excel = self.directory / "app.xlsx"
        self.excel.write_bytes(b"Excel original")
        self.notion = self.directory / "notion.json"
        self.notion.write_text('{"filas": []}', encoding="utf-8")
        self.output = self.directory / "csv"
        self.result = {
            "juegos": [
                {"idJuego": 1, "nombreJuego": 'Juego, "ñ"', "tipo": "Juego base", "idJuegoBase": None},
                {"idJuego": 2, "nombreJuego": "Expansión", "tipo": "Expansión", "idJuegoBase": 1},
            ],
            "ejemplares": [{
                "idEjemplar": "0009_ÁRBOL", "idJuego": 1, "esExterno": False,
                "estadoCompletitud": "Completo", "situacion": None,
                "comentarios": 'Falta una pieza, "roja"\ny otra azul.',
                "componentes": "Tablero", "estadoEjemplar": "En bodega",
            }],
            "informe": {"conteos": {}, "supuestos": [{"codigo": "qr_codigo"}]},
            "incidencias": [],
        }

    def run_cli(self, *, result=None, error=None, output=None):
        stdout, stderr = StringIO(), StringIO()
        with patch.object(cli, "preparar", return_value=deepcopy(result or self.result), side_effect=error) as prepare, \
                redirect_stdout(stdout), redirect_stderr(stderr):
            code = cli.main([
                "--excel", str(self.excel), "--notion", str(self.notion),
                "--salida", str(output if output is not None else self.output),
            ])
        return code, stdout.getvalue(), stderr.getvalue(), prepare

    def test_single_command_exports_three_csv_and_report_without_modifying_sources(self):
        before = self.excel.read_bytes(), self.notion.read_bytes()
        code, stdout, stderr, prepare = self.run_cli()
        self.assertEqual(code, 0, stderr)
        prepare.assert_called_once_with(self.excel, self.notion)
        self.assertEqual({item.name for item in self.output.iterdir()}, {*cli.CSV_ARCHIVOS, "informe.json"})
        report = json.loads((self.output / "informe.json").read_text())
        self.assertTrue(report["aptoParaImportar"])
        self.assertEqual(report["archivos"], dict.fromkeys(cli.CSV_ARCHIVOS, 1))
        self.assertEqual(report["supuestos"], self.result["informe"]["supuestos"])
        self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(report))
        self.assertIn("No se modificó la base de datos", stdout)
        self.assertEqual(before, (self.excel.read_bytes(), self.notion.read_bytes()))

    def test_csv_roundtrip_preserves_unicode_quotes_newlines_nulls_and_booleans(self):
        code, _, stderr, _ = self.run_cli()
        self.assertEqual(code, 0, stderr)
        with (self.output / "juegos_base.csv").open(encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            self.assertEqual(reader.fieldnames, list(cli.JUEGO_COLUMNAS))
            game = next(reader)
        self.assertEqual(game["nombreJuego"], 'Juego, "ñ"')
        self.assertEqual(game["idJuegoBase"], "")
        with (self.output / "ejemplares.csv").open(encoding="utf-8", newline="") as file:
            copy = next(csv.DictReader(file))
        self.assertEqual(copy["idEjemplar"], "0009_ÁRBOL")
        self.assertEqual(copy["comentarios"], self.result["ejemplares"][0]["comentarios"])
        self.assertEqual(copy["esExterno"], "false")
        self.assertEqual(copy["estadoCompletitud"], "Completo")
        self.assertEqual(copy["situacion"], "")
        self.assertNotIn("None", (self.output / "ejemplares.csv").read_text())

    def test_true_is_exported_as_lowercase_boolean(self):
        result = deepcopy(self.result)
        result["ejemplares"][0]["esExterno"] = True
        code, _, stderr, _ = self.run_cli(result=result)
        self.assertEqual(code, 0, stderr)
        with (self.output / "ejemplares.csv").open(newline="") as file:
            self.assertEqual(next(csv.DictReader(file))["esExterno"], "true")

    def test_regeneration_is_byte_identical(self):
        self.assertEqual(self.run_cli()[0], 0)
        first = {file.name: file.read_bytes() for file in self.output.iterdir()}
        self.assertEqual(self.run_cli()[0], 0)
        self.assertEqual(first, {file.name: file.read_bytes() for file in self.output.iterdir()})

    def test_validation_error_leaves_only_report_and_removes_stale_csv(self):
        self.assertEqual(self.run_cli()[0], 0)
        result = deepcopy(self.result)
        result["incidencias"] = [{"nivel": "error", "codigo": "qr_duplicado", "mensaje": "Código repetido"}]
        code, _, stderr, _ = self.run_cli(result=result)
        self.assertEqual(code, 2)
        self.assertIn("No se generaron CSV", stderr)
        self.assertIn("Código repetido", stderr)
        self.assertEqual([file.name for file in self.output.iterdir()], ["informe.json"])
        report = json.loads((self.output / "informe.json").read_text())
        self.assertFalse(report["aptoParaImportar"])
        self.assertEqual(report["archivos"], {})
        self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(report))

    def test_warnings_are_reported_without_blocking_csv(self):
        result = deepcopy(self.result)
        result["incidencias"] = [{"nivel": "advertencia", "codigo": "prestado_sin_prestamo", "mensaje": "Préstamo sin historial"}]
        code, stdout, stderr, _ = self.run_cli(result=result)
        self.assertEqual(code, 0, stderr)
        self.assertIn("0 errores, 1 advertencias", stdout)

    def test_read_or_zod_bridge_failure_generates_error_report_without_csv(self):
        for error in (OSError("No se puede leer el archivo"), ValueError("Notion inválido"), cli.ZodBridgeError("Node no disponible")):
            with self.subTest(error=error):
                code, _, stderr, _ = self.run_cli(error=error)
                self.assertEqual(code, 2)
                report = json.loads((self.output / "informe.json").read_text())
                self.assertFalse(report["aptoParaImportar"])
                self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(report))
                self.assertIn(str(error), stderr)
                self.assertFalse(any(self.output.glob("*.csv")))

    def test_sources_cannot_be_inside_the_output_directory(self):
        before = self.excel.read_bytes(), self.notion.read_bytes()
        code, _, _, prepare = self.run_cli(output=self.directory)
        self.assertEqual(code, 1)
        prepare.assert_not_called()
        self.assertEqual(before, (self.excel.read_bytes(), self.notion.read_bytes()))

    def test_corrupt_workbook_reports_error_instead_of_exporting(self):
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            code = cli.main([
                "--excel", str(self.excel), "--notion", str(self.notion),
                "--salida", str(self.output),
            ])
        self.assertEqual(code, 2)
        report = json.loads((self.output / "informe.json").read_text())
        self.assertFalse(report["aptoParaImportar"])
        self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(report))
        self.assertFalse(any(self.output.glob("*.csv")))

    def test_source_file_cannot_be_used_as_output_directory(self):
        before = self.excel.read_bytes()
        code, _, _, prepare = self.run_cli(output=self.excel)
        self.assertEqual(code, 1)
        prepare.assert_not_called()
        self.assertEqual(self.excel.read_bytes(), before)

    def test_unrelated_files_are_not_overwritten_or_deleted(self):
        self.output.mkdir()
        unrelated = self.output / "inventario-revisado.csv"
        unrelated.write_bytes(b"No reemplazar")
        code, _, _, prepare = self.run_cli()
        self.assertEqual(code, 1)
        prepare.assert_not_called()
        self.assertEqual(unrelated.read_bytes(), b"No reemplazar")

    def test_symlink_or_hardlink_outputs_cannot_alias_sources(self):
        self.output.mkdir()
        for kind in ("symlink", "hardlink"):
            with self.subTest(kind=kind):
                destination = self.output / "informe.json"
                if kind == "symlink":
                    destination.symlink_to(self.notion)
                else:
                    destination.hardlink_to(self.notion)
                before = self.notion.read_bytes()
                code, _, _, prepare = self.run_cli()
                self.assertEqual(code, 1)
                prepare.assert_not_called()
                self.assertEqual(before, self.notion.read_bytes())
                destination.unlink()

    def test_interface_has_no_database_commands_or_credentials(self):
        stdout = StringIO()
        with redirect_stdout(stdout), self.assertRaises(SystemExit) as stopped:
            cli.main(["--help"])
        self.assertEqual(stopped.exception.code, 0)
        help_text = stdout.getvalue()
        for argument in ("--excel", "--notion", "--salida"):
            self.assertIn(argument, help_text)
        for argument in ("--dsn", "--confirmar", "--simular", "--decisiones"):
            self.assertNotIn(argument, help_text)


if __name__ == "__main__":
    unittest.main()
