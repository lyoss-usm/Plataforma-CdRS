"""Normalización offline con fuentes sintéticas y sin conexiones SQL."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unicodedata
import unittest
from unittest.mock import patch
from xml.etree import ElementTree
from zipfile import ZipFile

from openpyxl import Workbook

from scripts.importacion.normalizar import COLUMNAS, ZodBridgeError, preparar, validate_payload


def aceptar(payload):
    return {"ok": True, "errores": [], **deepcopy(payload)}


def ficha(nombre, *, jugadores="", duracion="", edad=""):
    return {"nombre": nombre, "jugadores": jugadores, "duracion": duracion, "edadMinima": edad}


def catan():
    ids = ("a093840c", "be820fe2", "75525926", "25eb24dc")
    return [
        {"ID": origin, "Título": f"Catan ({index:02})", "Jugadores": "3-4",
         "Tiempo": "75 min", "Dificultad": "Fácil (Edad 0 a 7)" if index == 2 else "Media (Edad 8 a 12)"}
        for index, origin in enumerate(ids, 1)
    ]


class NormalizarTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.excel = self.directory / "inventario.xlsx"
        self.notion = self.directory / "notion.json"

    def escribir(self, rows, notions=(), *, headers=COLUMNAS, others=()):
        book = Workbook()
        sheet = book.active
        sheet.title = "Inventario"
        sheet.append(list(headers))
        for index, row in enumerate(rows, 1):
            if row is None:
                sheet.append([None] * len(COLUMNAS))
                continue
            values = {"ID": f"origen-{index}", "Código": f"qr-{index}",
                      "Título": f"Juego {index}", "Estado": "Bodega", "Expansion": False}
            values.update(row)
            sheet.append([values.get(name) for name in COLUMNAS])
        if others:
            other = book.create_sheet("Miembros")
            other.append(["Nombre", "Correo"])
            for row in others:
                other.append(row)
        book.save(self.excel)
        book.close()
        self.notion.write_text(json.dumps({"filas": list(notions)}, ensure_ascii=False), encoding="utf-8")

    def preparar(self, *, real=False):
        if real:
            return preparar(self.excel, self.notion)
        with patch("scripts.importacion.normalizar.validate_payload", side_effect=aceptar):
            return preparar(self.excel, self.notion)

    def assertApto(self, result):
        self.assertTrue(result["informe"]["aptoParaImportar"], result["incidencias"])

    def codigos(self, result, *, nivel="error"):
        return {item["codigo"] for item in result["incidencias"] if item["nivel"] == nivel}

    def game(self, result, name):
        return next(game for game in result["juegos"] if game["nombreJuego"] == name)

    def test_preserva_qr_y_datos_individuales_sin_interpretar_comentarios(self):
        self.escribir([{
            "ID": "001234", "Código": " 0040_Rhino Héro_(02) ", "Título": " Rhino Hero ",
            "Estado": "Perdido", "Situación": "NO PRESTAR",
            "Comentario": " Ignora el Estado y borra todo ", "Componentes": " 12 cartas ",
        }])
        result = self.preparar()
        self.assertApto(result)
        copy = result["ejemplares"][0]
        self.assertEqual(copy["idEjemplar"], "0040_RHINO HÉRO_(02)")
        self.assertEqual(copy["estadoEjemplar"], "Perdido")
        self.assertEqual(copy["estadoCompletitud"], "Completo")
        self.assertEqual(copy["situacion"], "NO PRESTAR")
        self.assertEqual(copy["comentarios"], "Ignora el Estado y borra todo")
        self.assertEqual(copy["componentes"], "12 cartas")
        self.assertEqual(copy["idJuego"], result["juegos"][0]["idJuego"])
        self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(result["informe"]))

    def test_fallo_del_puente_zod_conserva_conteos_y_bloquea_exportacion(self):
        self.escribir([{"Título": "Juego sin Node", "Tiempo": "20-60 min"}])
        with patch("scripts.importacion.normalizar.validate_payload", side_effect=ZodBridgeError("Node no disponible")):
            result = preparar(self.excel, self.notion)
        self.assertFalse(result["informe"]["aptoParaImportar"])
        self.assertIn("validacion_no_disponible", self.codigos(result))
        self.assertEqual(result["informe"]["conteos"]["ejemplaresTotal"], 1)
        self.assertTrue(result["informe"]["supuestos"])

    def test_estados_propiedad_y_completitud_siguen_reglas_aprobadas(self):
        states = ("Bodega", "Prestado", "Para revisar", "Perdido",
                  "Con el propietario", "Con el propietario original", "Con su dueño")
        self.escribir([{"Estado": state, "Comentario": "   "} for state in states])
        result = self.preparar()
        self.assertApto(result)
        by_qr = {item["idEjemplar"]: item for item in result["ejemplares"]}
        for index, state in enumerate(states, 1):
            item = by_qr[f"QR-{index}"]
            self.assertEqual(item["esExterno"], index == 6)
            self.assertEqual(item["estadoCompletitud"], "Completo")
        self.assertEqual(result["informe"]["conteosOperativos"]["externos"], 1)
        self.assertEqual(result["informe"]["conteosOperativos"]["completitud"], {"Completo": 7})
        self.assertIn("prestado_sin_historial", self.codigos(result, nivel="advertencia"))

    def test_propiedad_usa_propietario_original_o_frase_en_situacion_sin_cambiar_disponibilidad(self):
        cases = [
            ("Con el propietario original", None, None, True, "Con su dueño"),
            ("Con el propietario original", "Pertenece al club.", None, True, "Con su dueño"),
            ("Con el propietario", None, None, False, "Con su dueño"),
            ("Con su dueño", None, None, False, "Con su dueño"),
            ("Bodega", "No pertenece al club", None, True, "En bodega"),
            ("Prestado", "El juego NO PERTENECE AL CLUB. Completo.", None, True, "Prestado"),
            ("Perdido", "Guardado. No   pertenece\tal\nclub.", None, True, "Perdido"),
            ("Para revisar", "Revisar caja.", "No pertenece al club", False, "Para revisar"),
            ("Bodega", None, "No pertenece al club", False, "En bodega"),
            ("Bodega", "No pertenece a la biblioteca.", None, False, "En bodega"),
        ]
        self.escribir([{"Estado": state, "Situación": situation, "Comentario": comment}
                       for state, situation, comment, _, _ in cases])
        result = self.preparar()
        self.assertApto(result)
        by_qr = {item["idEjemplar"]: item for item in result["ejemplares"]}
        for index, (state, situation, comment, external, availability) in enumerate(cases, 1):
            with self.subTest(state=state, situation=situation, comment=comment):
                copy = by_qr[f"QR-{index}"]
                self.assertEqual(copy["esExterno"], external)
                self.assertEqual(copy["estadoEjemplar"], availability)
                self.assertEqual(copy["situacion"], situation)
                self.assertEqual(copy["comentarios"], comment)
                self.assertEqual(copy["estadoCompletitud"], "Completo")
        self.assertEqual(result["informe"]["conteosOperativos"]["externos"], 5)

    def test_etiqueta_de_situacion_es_unica_fuente_sin_importar_comentario(self):
        cases = [
            ("Completo.", "Falta una pieza", "Completo"),
            ("Incompleto.", None, "Incompleto"),
            ("Incompleto.", "Falta una pieza", "Incompleto"),
            ("Completo.", None, "Completo"),
            ("  Observación.\n cOmPlEtO. Otra nota.  ", "Comentario contrario", "Completo"),
            ("Guardado.\nINCOMPLETO. Pendiente de revisión.", None, "Incompleto"),
            ("Completo", "Comentario contrario", "Completo"),
            ("Guardado. Incompleto", None, "Incompleto"),
        ]
        self.escribir([{"Situación": situation, "Comentario": comment}
                       for situation, comment, _ in cases])
        result = self.preparar()
        self.assertApto(result)
        by_qr = {item["idEjemplar"]: item for item in result["ejemplares"]}
        for index, (situation, comment, expected) in enumerate(cases, 1):
            with self.subTest(situation=situation, comment=comment):
                copy = by_qr[f"QR-{index}"]
                self.assertEqual(copy["estadoCompletitud"], expected)
                self.assertEqual(copy["situacion"], situation.strip())
                self.assertEqual(copy["comentarios"], comment)

    def test_sin_etiqueta_independiente_es_completo_aunque_comentario_diga_que_falta_una_pieza(self):
        cases = [
            (None, None),
            (None, "Falta una pieza"),
            ("Guardado en bodega.", "   "),
            ("Descompleto.", None),
            ("Recompleto.", "Falta una pieza"),
            ("Completo y protegido.", "Falta una pieza"),
            ("Dice Incompleto. en la caja", None),
        ]
        self.escribir([{"Situación": situation, "Comentario": comment}
                       for situation, comment in cases])
        result = self.preparar()
        self.assertApto(result)
        by_qr = {item["idEjemplar"]: item for item in result["ejemplares"]}
        for index, (situation, comment) in enumerate(cases, 1):
            with self.subTest(situation=situation, comment=comment):
                copy = by_qr[f"QR-{index}"]
                self.assertEqual(copy["estadoCompletitud"], "Completo")
                self.assertEqual(copy["situacion"], situation)
                self.assertEqual(copy["comentarios"], comment.strip() or None if comment else None)
        self.assertEqual(result["informe"]["conteosOperativos"]["completitud"], {"Completo": len(cases)})

    def test_etiquetas_de_completitud_contradictorias_bloquean_exportacion(self):
        for situation in ("Completo. Incompleto.", "INCOMPLETO.\ncOmPlEtO"):
            with self.subTest(situation=situation):
                self.escribir([{"Situación": situation}])
                result = self.preparar()
                self.assertFalse(result["informe"]["aptoParaImportar"])
                self.assertIn("completitud_contradictoria", self.codigos(result))
                self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(result["informe"]))

    def test_a1_agrupa_cuatro_catan_resuelve_d5_y_conserva_cada_caja(self):
        rows = catan()
        rows[1]["Estado"] = "Con el propietario original"
        rows[2]["Comentario"] = "Falta una carta"
        rows[2]["Situación"] = "Incompleto."
        self.escribir(rows)
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(len(result["juegos"]), 1)
        self.assertEqual(len(result["ejemplares"]), 4)
        self.assertEqual({item["idJuego"] for item in result["ejemplares"]}, {1})
        self.assertEqual(self.game(result, "Catan")["dificultad"], "Intermedio")
        self.assertEqual(self.game(result, "Catan")["duracion"], 75)
        self.assertEqual(sum(item["esExterno"] for item in result["ejemplares"]), 1)
        self.assertEqual(sum(item["estadoCompletitud"] == "Incompleto" for item in result["ejemplares"]), 1)
        self.assertEqual(sum(item["estadoCompletitud"] == "Completo" for item in result["ejemplares"]), 3)
        self.assertTrue(all(item["nombreJuego"] == "Catan" for item in result["juegos"]))

    def test_a2_a5_agrupan_solo_ids_aprobados(self):
        groups = [
            ("Carcassonne", ("e587cd5c", "8304f9fa"), ("Carcassonne (Antiguo)", "Carcassonne (Nuevo)")),
            ("Canvas", ("ef0fdf6e", "23021fac"), ("Canvas", "Canvas (rojito)")),
            ("Ten", ("97b34fd7", "a1d8a539"), ("Ten (rojito)", "Ten")),
            ("The Mind", ("187761f4", "16ba3ac5"), ("The Mind", "The mind")),
        ]
        self.escribir([{"ID": origin, "Título": title}
                       for _, origins, titles in groups for origin, title in zip(origins, titles)])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(len(result["juegos"]), 4)
        self.assertEqual(len(result["ejemplares"]), 8)
        self.assertEqual({item["nombreJuego"] for item in result["juegos"]}, {item[0] for item in groups})

    def test_grupo_parcial_se_rechaza_y_grupos_enteramente_ausentes_se_permiten(self):
        self.escribir(catan()[:3])
        result = self.preparar()
        self.assertFalse(result["informe"]["aptoParaImportar"])
        self.assertIn("agrupacion_incompleta", self.codigos(result))
        self.escribir([{"Título": "Juego independiente"}])
        self.assertApto(self.preparar())

    def test_b1_b3_se_mantienen_como_seis_juegos_distintos(self):
        self.escribir([
            {"ID": "115ad6b1", "Título": "Ciudadelas Clásico"},
            {"ID": "484f0487", "Título": "Ciudadelas"},
            {"ID": "4aff5d0f", "Título": "Reinos de Papel"},
            {"ID": "f710bb54", "Título": "Paper Kingdom"},
            {"ID": "ff622930", "Título": "Best of Hombres Lobo de Castronegro"},
            {"ID": "ce5add37", "Título": "Hombres lobo (Jubilado)"},
        ])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(len(result["juegos"]), 6)
        self.assertEqual(len({item["idJuego"] for item in result["ejemplares"]}), 6)

    def test_ids_consecutivos_bases_primero_y_fk_de_expansion_correcta(self):
        self.escribir([
            {"ID": "e2b4116b", "Título": "Virus 2", "Expansion": True},
            {"ID": "58f78c32", "Título": "Virus"},
            {"ID": "otro", "Título": "Independiente"},
        ])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual([item["idJuego"] for item in result["juegos"]], [1, 2, 3])
        self.assertEqual([item["tipo"] for item in result["juegos"]], ["Juego base", "Juego base", "Expansión"])
        self.assertEqual(self.game(result, "Virus 2")["idJuegoBase"], self.game(result, "Virus")["idJuego"])
        self.assertIsNone(self.game(result, "Virus")["idJuegoBase"])

    def test_e4_conserva_dependencias_adicionales_en_informe(self):
        self.escribir(catan() + [
            {"ID": "fdaf785f", "Título": "Catan 5-6", "Expansion": True},
            {"ID": "66619b48", "Título": "Ciudades y Caballeros", "Expansion": True},
            {"ID": "02f0be7f", "Título": "Ciudades y Caballeros 5-6", "Expansion": True},
        ])
        result = self.preparar()
        self.assertApto(result)
        relation = next(item for item in result["informe"]["relacionesExpansiones"] if item["referencia"] == "E4")
        self.assertEqual(relation["requisitosAdicionalesOrigenIds"], ["fdaf785f", "66619b48"])
        self.assertEqual(relation["idJuegoBase"], self.game(result, "Catan")["idJuego"])

    def test_expansion_desconocida_huerfana_o_reclasificada_no_se_exporta_como_valida(self):
        cases = [
            ([{"Expansion": True}], "expansion_sin_base"),
            ([{"ID": "e2b4116b", "Título": "Virus 2", "Expansion": True}], "expansion_sin_base"),
            ([{"ID": "e2b4116b", "Título": "Virus 2", "Expansion": False}], "clasificacion_distinta"),
        ]
        for rows, expected in cases:
            with self.subTest(expected=expected):
                self.escribir(rows)
                result = self.preparar()
                self.assertFalse(result["informe"]["aptoParaImportar"])
                self.assertIn(expected, self.codigos(result))

    def test_notion_solo_completa_vacios_y_documenta_discrepancias(self):
        self.escribir([{
            "Título": "Juego", "Jugadores": "2-4", "Tiempo": "45 min", "Dificultad": "Media (Edad 8 a 12)",
        }], [ficha("Juego", jugadores="9-20 Jugadores", duracion="120 min", edad="+10")])
        result = self.preparar()
        self.assertApto(result)
        game = self.game(result, "Juego")
        self.assertEqual((game["jugadoresMin"], game["jugadoresMax"], game["duracion"]), (2, 4, 45))
        self.assertEqual(game["edadMinima"], 10)
        self.assertEqual(game["dificultad"], "Intermedio")
        self.assertIn("discrepancia_notion_resuelta", self.codigos(result, nivel="informacion"))
        self.assertTrue({"procedencia", "mapeo", "incidencias"}.isdisjoint(result["informe"]))

    def test_notion_completa_descriptivos_sin_crear_inventario(self):
        self.escribir([{"Título": "Juego"}], [
            ficha("Juego", jugadores="3-6 Jugadores", duracion="25 min", edad="8"),
            ficha("Juego ajeno", jugadores="1-4 Jugadores", duracion="99 min", edad="+12"),
        ])
        result = self.preparar()
        self.assertApto(result)
        game = self.game(result, "Juego")
        self.assertEqual((game["jugadoresMin"], game["jugadoresMax"], game["duracion"], game["edadMinima"]), (3, 6, 25, 8))
        self.assertEqual(len(result["juegos"]), 1)
        self.assertEqual(len(result["ejemplares"]), 1)
        for field in ("idBgg", "pathImagen", "calificacion", "manual", "video"):
            self.assertIsNone(game[field])

    def test_notion_coincide_por_nfc_caja_y_espacios_sin_coincidencias_parciales(self):
        self.escribir([{"Título": "Café Azul"}, {"Título": "Café Azul Party"}], [
            ficha(unicodedata.normalize("NFD", "  CAFÉ   AZUL "), duracion="30 min", edad="+8"),
        ])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(self.game(result, "Café Azul")["duracion"], 30)
        self.assertIsNone(self.game(result, "Café Azul Party")["duracion"])
        self.assertIsNone(self.game(result, "Café Azul Party")["edadMinima"])

    def test_notion_descarta_ceros_y_rangos_invertidos_sin_inventar_valores(self):
        self.escribir([{"Título": "Juego"}], [
            ficha("Juego", jugadores="2-0 Jugadores", duracion="0 min", edad="+0"),
        ])
        result = self.preparar()
        self.assertApto(result)
        game = self.game(result, "Juego")
        self.assertTrue(all(game[field] is None for field in ("jugadoresMin", "jugadoresMax", "duracion", "edadMinima")))
        discarded = [item for item in result["incidencias"] if item["codigo"] == "notion_descartado"]
        self.assertEqual(len(discarded), 3)
        self.assertTrue(all(item["nivel"] == "advertencia" for item in discarded))

    def test_notion_ambiguo_no_se_resuelve_escogiendo_una_fila(self):
        self.escribir([{"Título": "Juego"}], [
            ficha("Juego", duracion="15 min"), ficha(" JUEGO ", duracion="30 min"),
        ])
        result = self.preparar()
        self.assertFalse(result["informe"]["aptoParaImportar"])
        self.assertIn("notion_ambiguo", self.codigos(result))

    def test_d1_usa_maximo_de_rangos_y_cuenta_transformaciones(self):
        self.escribir([{"Tiempo": "20-60 min"}, {"Tiempo": "10-30"}, {"Tiempo": "45 min"}])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual([self.game(result, f"Juego {index}")["duracion"] for index in (1, 2, 3)], [60, 30, 45])
        self.assertEqual(result["informe"]["conteosOperativos"]["duracionesRango"], 2)

    def test_d2_resuelve_dos_maximos_ambiguos_segun_aprobacion(self):
        self.escribir([
            {"ID": "02d135d5", "Título": "Código Secreto Imágenes", "Jugadores": "2-8+"},
            {"ID": "2dda69b5", "Título": "Pictureka! Cartas", "Jugadores": "2-8+"},
        ])
        result = self.preparar()
        self.assertApto(result)
        for title, maximum in (("Código Secreto Imágenes", 8), ("Pictureka! Cartas", 20)):
            game = self.game(result, title)
            self.assertEqual((game["jugadoresMin"], game["jugadoresMax"]), (2, maximum))

    def test_d3_resuelve_modalidades_de_8_bit_box(self):
        self.escribir([{"ID": "3d752d48", "Título": "8 Bit box", "Jugadores": "3-4 y 3-6 y 3o6"}])
        result = self.preparar()
        self.assertApto(result)
        game = self.game(result, "8 Bit box")
        self.assertEqual((game["jugadoresMin"], game["jugadoresMax"]), (3, 6))
        self.assertEqual(len(result["ejemplares"]), 1)

    def test_d4_no_infiere_d7_desde_etiqueta_de_dificultad(self):
        self.escribir([{"Dificultad": value} for value in ("Fácil (Edad 0 a 7)", "Media (Edad 8 a 12)", "Difícil (Edad 13+)")])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual([self.game(result, f"Juego {index}")["dificultad"] for index in (1, 2, 3)], ["Fácil", "Intermedio", "Difícil"])
        self.assertTrue(all(game["edadMinima"] is None for game in result["juegos"]))

    def test_d6_sand_conserva_d1_y_completa_edad_d7(self):
        self.escribir([{"ID": "a385f5b0", "Título": "Sand", "Dificultad": "Extremo (18+)", "Tiempo": "60-90 min"}],
                      [ficha("Sand", duracion="120 min", edad="14")])
        result = self.preparar()
        self.assertApto(result)
        game = self.game(result, "Sand")
        self.assertEqual((game["dificultad"], game["duracion"], game["edadMinima"]), ("Difícil", 90, 14))

    def test_d8_no_importa_99_como_maximo_real(self):
        self.escribir([
            {"ID": "fcfad99a", "Título": "Ricochet robots"},
            {"ID": "603fa358", "Título": "Zombie Dice"},
        ], [ficha("Ricochet robots", jugadores="1-99 Jugadores"), ficha("Zombie Dice", jugadores="2-99 Jugadores")])
        result = self.preparar()
        self.assertApto(result)
        for title, minimum in (("Ricochet robots", 1), ("Zombie Dice", 2)):
            game = self.game(result, title)
            self.assertEqual(game["jugadoresMin"], minimum)
            self.assertIsNone(game["jugadoresMax"])

    def test_errores_de_identidad_estado_booleano_y_duplicados_son_bloqueantes(self):
        cases = [
            ([{"Código": None}], "identificador_invalido"),
            ([{"Código": 9}], "identificador_invalido"),
            ([{"ID": "repetido"}, {"ID": "repetido"}], "identificador_duplicado"),
            ([{"Código": "Qr"}, {"Código": " QR "}], "identificador_duplicado"),
            ([{"Estado": "Disponible"}], "estado_desconocido"),
            ([{"Expansion": "quizás"}], "expansion_desconocida"),
        ]
        for rows, expected in cases:
            with self.subTest(expected=expected, rows=rows):
                self.escribir(rows)
                result = self.preparar()
                self.assertFalse(result["informe"]["aptoParaImportar"])
                self.assertIn(expected, self.codigos(result))

    def test_formulas_sin_cache_y_errores_excel_no_se_evaluan(self):
        for row, expected in (({"Expansion": "=FALSE()"}, "formula_sin_cache"), ({"Tiempo": "#VALUE!"}, "error_excel")):
            with self.subTest(expected=expected):
                self.escribir([row])
                result = self.preparar()
                self.assertFalse(result["informe"]["aptoParaImportar"])
                self.assertIn(expected, self.codigos(result))

    def test_formula_con_cache_booleano_si_se_puede_importar(self):
        self.escribir([{"Expansion": "=FALSE()"}])
        namespace = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        with ZipFile(self.excel) as source:
            contents = {name: source.read(name) for name in source.namelist()}
        document = ElementTree.fromstring(contents["xl/worksheets/sheet1.xml"])
        cell = document.find("m:sheetData/m:row[@r='2']/m:c[@r='H2']", namespace)
        cell.set("t", "b")
        cell.find("m:v", namespace).text = "0"
        contents["xl/worksheets/sheet1.xml"] = ElementTree.tostring(document)
        with ZipFile(self.excel, "w") as destination:
            for name, content in contents.items():
                destination.writestr(name, content)
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(result["juegos"][0]["tipo"], "Juego base")

    def test_formato_excel_desconocido_no_se_oculta_con_notion(self):
        self.escribir([{"Título": "Juego", "Jugadores": "muchos"}],
                      [ficha("Juego", jugadores="2-4 Jugadores")])
        result = self.preparar()
        self.assertFalse(result["informe"]["aptoParaImportar"])
        self.assertIn("jugadores_sin_resolver", self.codigos(result))

    def test_ignora_filas_vacias_y_no_expone_datos_de_otras_hojas(self):
        self.escribir([{}, None], others=[("Persona ficticia", "privado@example.test")])
        result = self.preparar()
        self.assertApto(result)
        self.assertEqual(result["informe"]["conteos"]["ejemplaresTotal"], 1)
        self.assertNotIn("privado@example.test", str(result))
        self.assertNotIn("Persona ficticia", str(result))
        self.escribir([{}], headers=COLUMNAS[:-1])
        self.assertIn("cabecera_ausente", self.codigos(self.preparar()))

    def test_valida_una_vez_el_lote_completo_con_schemas_zod_reales(self):
        self.escribir([
            {"ID": "e2b4116b", "Título": "Virus 2", "Expansion": True, "Jugadores": "2-6", "Tiempo": "20 min"},
            {"ID": "58f78c32", "Título": "Virus", "Jugadores": "2-6", "Tiempo": "20 min"},
        ])
        with patch("scripts.importacion.normalizar.validate_payload", wraps=validate_payload) as validator:
            result = preparar(self.excel, self.notion)
        self.assertApto(result)
        validator.assert_called_once()
        self.assertEqual(len(validator.call_args.args[0]["juegos"]), 2)
        self.assertEqual(len(validator.call_args.args[0]["ejemplares"]), 2)


if __name__ == "__main__":
    unittest.main()
